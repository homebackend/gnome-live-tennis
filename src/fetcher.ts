// src/fetcher.ts

import Soup from "gi://Soup";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import { TennisEvent, TennisMatch } from "./types";
import Gio from "gi://Gio";
import { AtpFetcher } from "./atp_fetcher";
import { WtaFetcher } from "./wta_fetcher";

type StringToTennisEventMap = {
    [key: string]: TennisEvent
};

export enum QueryResponseType {
    DeleteTournament,
    AddTournament,
    UpdateTournament,
    DeleteMatch,
    AddMatch,
    UpdateMatch,
};

// The GObject.registerClass call must wrap the class definition
export const LiveTennis = GObject.registerClass({
    GTypeName: 'LiveTennis', // It's a good practice to provide a unique GTypeName
}, class LiveTennis extends GObject.Object {
    private _atp_fetcher: AtpFetcher;
    private _wta_fetcher: WtaFetcher;
    private _atp_lock: boolean;
    private _atp_challenger_lock: boolean;
    private _wta_lock: boolean;
    private _log: (logs: string[]) => void;
    private _settings: Gio.Settings;

    private _atp_events: StringToTennisEventMap;
    private _atp_challenger_events: StringToTennisEventMap;
    private _wta_events: StringToTennisEventMap;

    constructor(log: (logs: string[]) => void, settings: Gio.Settings) {
        super();

        this._atp_lock = false;
        this._atp_challenger_lock = false;
        this._wta_lock = false;
        this._log = log;
        this._settings = settings;
        this._atp_events = {};
        this._atp_challenger_events = {};
        this._wta_events = {};

        this._atp_fetcher = new AtpFetcher(this._build_req.bind(this), this._fetch_data_common.bind(this));
        this._wta_fetcher = new WtaFetcher(this._build_req.bind(this), this._fetch_data_common.bind(this));
    }

    _build_req(url: string): Soup.Message {
        this._log(['Fetching url', url]);
        let request = Soup.Message.new("GET", url);
        request.request_headers.append("Cache-Control", "no-cache");
        request.request_headers.append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6831.62 Safari/537.36");
        return request;
    }

    _fetch_data_common(httpSession: Soup.Session, msg: Soup.Message, handler: (json_data: any) => any) {
        httpSession.timeout = 60000;

        httpSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (_, r) => {
            try {
                const bytes = httpSession.send_and_read_finish(r).get_data();
                if (bytes == null) {
                    this._log(['Invalid empty response']);
                    return;
                }
                const response = new TextDecoder('utf-8').decode(bytes);
                if (msg.get_status() > 299) {
                    this._log(["Remote server error: ", msg.get_status().toString(), response]);
                    return;
                }
                const jsonData = JSON.parse(response);
                if (jsonData.length === 0) {
                    this._log(["Remote server error:", response]);
                    return;
                }

                this._log(['Received response']);
                handler(jsonData);
            } catch (e) {
                this._log([`Error fetching data: ${e}`]);
                if (e instanceof Error && e.stack) {
                    this._log(['Stack trace', e.stack]);
                }
                handler(null);
            }
        });
    }

    _fetch_atp_data_common(oldEvents: StringToTennisEventMap, tour: string, callback: (e: StringToTennisEventMap) => void) {
        this._atp_fetcher.fetchData(tour, tennisEvents => {
            if (!tennisEvents) {
                this._log([`Fetch for ${tour} received no data`]);
                return callback(oldEvents);
            }

            const tennisEventsMap: StringToTennisEventMap = {};
            tennisEvents.forEach(e => tennisEventsMap[e.id] = e);
            callback(tennisEventsMap);
        });
    }

    _fetch_atp_data(callback: (e: StringToTennisEventMap) => void) {
        if (this._atp_lock) {
            return callback(this._atp_events);
        }
        this._atp_lock = true;
        return this._fetch_atp_data_common(this._atp_events, 'ATP', (e: StringToTennisEventMap) => {
            this._atp_lock = false;
            callback(e);
        });
    }

    _fetch_atp_challenger_data(callback: (e: StringToTennisEventMap) => void) {
        if (this._atp_challenger_lock) {
            return callback(this._atp_challenger_events);
        }
        this._atp_challenger_lock = true;
        return this._fetch_atp_data_common(this._atp_challenger_events, 'ATP-Challenger', (e: StringToTennisEventMap) => {
            this._atp_challenger_lock = false;
            callback(e);
        });
    }

    _fetch_wta_data(callback: (e: StringToTennisEventMap) => void) {
        if (this._wta_lock) {
            return callback(this._wta_events);
        }
        this._wta_lock = true;

        return this._wta_fetcher.fetchData(tennisEvents => {
            this._wta_lock = false;

            if (!tennisEvents) {
                this._log(['Fetch for WTA received no data']);
                return callback(this._wta_events);
            }

            const tennisEventsMap: StringToTennisEventMap = {};
            tennisEvents.forEach(e => tennisEventsMap[e.id] = e);
            callback(tennisEventsMap);
        });
    }

    _post_fetch_handler(oldEvents: StringToTennisEventMap, newEvents: StringToTennisEventMap,
        eventCallback: (r: QueryResponseType, e: TennisEvent) => void,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => void) {
        for (const [eventId, oldEvent] of Object.entries(oldEvents)) {
            if (!(eventId in newEvents)) {
                eventCallback(QueryResponseType.DeleteTournament, oldEvent);
            } else {
                const newEvent = newEvents[eventId];
                for (const [matchId, oldMatch] of Object.entries(oldEvent.matchMapping)) {
                    if (!(matchId in newEvent.matchMapping)) {
                        matchCallback(QueryResponseType.DeleteMatch, oldEvent, oldMatch);
                    }
                }
            }
        }

        for (const [eventId, newEvent] of Object.entries(newEvents)) {
            if (!(eventId in oldEvents)) {
                eventCallback(QueryResponseType.AddTournament, newEvent);
                for (const match of newEvent.matches) {
                    matchCallback(QueryResponseType.AddMatch, newEvent, match);
                }
            } else {
                eventCallback(QueryResponseType.UpdateTournament, newEvent);
                const oldEvent = oldEvents[eventId];
                for (const [matchId, newMatch] of Object.entries(newEvent.matchMapping)) {
                    if (!(matchId in oldEvent.matchMapping)) {
                        matchCallback(QueryResponseType.AddMatch, newEvent, newMatch);
                    } else {
                        matchCallback(QueryResponseType.UpdateMatch, newEvent, newMatch);
                    }
                }
            }
        }
    }

    _process_tour_handler(oldEvents: StringToTennisEventMap, newEvents: StringToTennisEventMap,
        eventCallback: (r: QueryResponseType, e: TennisEvent) => void,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => void,
        doneCallback: (newEvents: StringToTennisEventMap) => void
    ) {
        this._post_fetch_handler(oldEvents, newEvents, eventCallback, matchCallback);
        doneCallback(newEvents);
    }

    _process_common(settingKey: string, oldEvents: StringToTennisEventMap,
        fetcher: (callback: (e: StringToTennisEventMap) => void) => void,
        eventCallback: (r: QueryResponseType, e: TennisEvent) => void,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => void,
        doneCallback: (newEvents: StringToTennisEventMap) => void) {
        if (this._settings.get_boolean(`enable-${settingKey}`)) {
            fetcher(newEvents => {
                this._process_tour_handler(oldEvents, newEvents, eventCallback, matchCallback, doneCallback);
                this._log([`${settingKey} processed`]);
            });
        } else {
            this._process_tour_handler(oldEvents, {}, eventCallback, matchCallback, doneCallback);
            this._log([`${settingKey} not enabled`]);
        }
    }

    _process_atp(eventCallback: (r: QueryResponseType, e: TennisEvent) => void,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => void,
        doneCallback: () => void) {
        this._process_common('atp', this._atp_events, this._fetch_atp_data.bind(this), eventCallback, matchCallback, newEvents => {
            this._atp_events = newEvents;
            doneCallback();
        });
    }

    _process_wta(eventCallback: (r: QueryResponseType, e: TennisEvent) => void,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => void,
        doneCallback: () => void) {
        this._process_common('wta', this._wta_events, this._fetch_wta_data.bind(this), eventCallback, matchCallback, newEvents => {
            this._wta_events = newEvents;
            doneCallback();
        });
    }

    _process_atp_challenger(eventCallback: (r: QueryResponseType, e: TennisEvent) => void,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => void,
        doneCallback: () => void) {
        this._process_common('atp-challenger', this._atp_challenger_events, this._fetch_atp_challenger_data.bind(this), eventCallback, matchCallback, newEvents => {
            this._atp_challenger_events = newEvents;
            doneCallback();
        });
    }

    query(eventCallback: (r: QueryResponseType, e: TennisEvent) => void,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => void,
        doneCallback: () => void) {

        const tourHandlers = [
            this._process_atp.bind(this),
            this._process_atp_challenger.bind(this),
            this._process_wta.bind(this),
        ];

        let count = 0;
        const myDoneCallback = () => {
            count += 1;
            if (count == tourHandlers.length) {
                this._log(['Query processing done']);
                if (doneCallback) {
                    doneCallback();
                }
            }
        }

        tourHandlers.forEach(h => h(eventCallback, matchCallback, myDoneCallback));
    }

    disable() {
        this._atp_fetcher.disable();
        this._wta_fetcher.disable();
    }
});
