// src/fetcher.ts

import { TennisEvent, TennisMatch } from "./types.js";
import { AtpFetcher } from "./atp_fetcher.js";
import { WtaFetcher } from "./wta_fetcher.js";
import { Settings } from "./settings.js";

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
export class LiveTennis {
    private _atp_fetcher: AtpFetcher;
    private _wta_fetcher: WtaFetcher;
    private _atp_lock: boolean;
    private _atp_challenger_lock: boolean;
    private _wta_lock: boolean;
    private _log: (logs: string[]) => void;
    private _settings: Settings/*Gio.Settings*/;

    private _atp_events: StringToTennisEventMap;
    private _atp_challenger_events: StringToTennisEventMap;
    private _wta_events: StringToTennisEventMap;

    constructor(log: (logs: string[]) => void, settings: Settings, atp_fetcher: AtpFetcher, wta_fetcher: WtaFetcher) {

        this._atp_lock = false;
        this._atp_challenger_lock = false;
        this._wta_lock = false;
        this._log = log;
        this._settings = settings;
        this._atp_events = {};
        this._atp_challenger_events = {};
        this._wta_events = {};

        this._atp_fetcher = atp_fetcher;
        this._wta_fetcher = wta_fetcher;
    }

    private _fetch_atp_data_common(oldEvents: StringToTennisEventMap, tour: string, callback: (good: boolean, e: StringToTennisEventMap) => void) {
        this._atp_fetcher.fetchData(tour, tennisEvents => {
            if (!tennisEvents) {
                this._log([`Fetch for ${tour} received no data`]);
                return callback(false, oldEvents);
            }

            const tennisEventsMap: StringToTennisEventMap = {};
            tennisEvents.forEach(e => tennisEventsMap[e.id] = e);
            callback(true, tennisEventsMap);
        });
    }

    private _fetch_atp_data(callback: (good: boolean, e: StringToTennisEventMap) => void) {
        if (this._atp_lock) {
            return callback(true, this._atp_events);
        }
        this._atp_lock = true;
        return this._fetch_atp_data_common(this._atp_events, 'ATP', (good: boolean, e: StringToTennisEventMap) => {
            this._atp_lock = false;
            callback(good, e);
        });
    }

    private _fetch_atp_challenger_data(callback: (good: boolean, e: StringToTennisEventMap) => void) {
        if (this._atp_challenger_lock) {
            return callback(true, this._atp_challenger_events);
        }
        this._atp_challenger_lock = true;
        return this._fetch_atp_data_common(this._atp_challenger_events, 'ATP-Challenger', (good: boolean, e: StringToTennisEventMap) => {
            this._atp_challenger_lock = false;
            callback(good, e);
        });
    }

    private _fetch_wta_data(callback: (good: boolean, e: StringToTennisEventMap) => void) {
        if (this._wta_lock) {
            return callback(true, this._wta_events);
        }
        this._wta_lock = true;

        return this._wta_fetcher.fetchData(tennisEvents => {
            this._wta_lock = false;

            if (!tennisEvents) {
                this._log(['Fetch for WTA received no data']);
                return callback(false, this._wta_events);
            }

            const tennisEventsMap: StringToTennisEventMap = {};
            tennisEvents.forEach(e => tennisEventsMap[e.id] = e);
            callback(true, tennisEventsMap);
        });
    }

    private async _post_fetch_handler(oldEvents: StringToTennisEventMap, newEvents: StringToTennisEventMap,
        eventCallback: (r: QueryResponseType, e: TennisEvent) => Promise<void>,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => Promise<void>) {
        for (const [eventId, oldEvent] of Object.entries(oldEvents)) {
            if (!(eventId in newEvents)) {
                await eventCallback(QueryResponseType.DeleteTournament, oldEvent);
            } else {
                const newEvent = newEvents[eventId];
                for (const [matchId, oldMatch] of Object.entries(oldEvent.matchMapping)) {
                    if (!(matchId in newEvent.matchMapping)) {
                        await matchCallback(QueryResponseType.DeleteMatch, oldEvent, oldMatch);
                    }
                }
            }
        }

        for (const [eventId, newEvent] of Object.entries(newEvents)) {
            if (!(eventId in oldEvents)) {
                await eventCallback(QueryResponseType.AddTournament, newEvent);
                for (const match of newEvent.matches) {
                    await matchCallback(QueryResponseType.AddMatch, newEvent, match);
                }
            } else {
                await eventCallback(QueryResponseType.UpdateTournament, newEvent);
                const oldEvent = oldEvents[eventId];
                for (const [matchId, newMatch] of Object.entries(newEvent.matchMapping)) {
                    if (!(matchId in oldEvent.matchMapping)) {
                        await matchCallback(QueryResponseType.AddMatch, newEvent, newMatch);
                    } else {
                        await matchCallback(QueryResponseType.UpdateMatch, newEvent, newMatch);
                    }
                }
            }
        }
    }

    private async _process_tour_handler(good: boolean, oldEvents: StringToTennisEventMap, newEvents: StringToTennisEventMap,
        eventCallback: (r: QueryResponseType, e: TennisEvent) => Promise<void>,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => Promise<void>,
        doneCallback: (good: boolean, newEvents: StringToTennisEventMap) => Promise<void>
    ) {
        await this._post_fetch_handler(oldEvents, newEvents, eventCallback, matchCallback);
        await doneCallback(good, newEvents);
    }

    private async _process_common(settingKey: string, oldEvents: StringToTennisEventMap,
        fetcher: (callback: (good: boolean, e: StringToTennisEventMap) => void) => void,
        eventCallback: (r: QueryResponseType, e: TennisEvent) => Promise<void>,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => Promise<void>,
        doneCallback: (good: boolean, newEvents: StringToTennisEventMap) => Promise<void>) {
        if (await this._settings.getBoolean(`enable-${settingKey}`)) {
            fetcher(async (good, newEvents) => {
                await this._process_tour_handler(good, oldEvents, newEvents, eventCallback, matchCallback, doneCallback);
                this._log([`${settingKey} processed`]);
            });
        } else {
            await this._process_tour_handler(true, oldEvents, {}, eventCallback, matchCallback, doneCallback);
            this._log([`${settingKey} not enabled`]);
        }
    }

    private async _process_atp(eventCallback: (r: QueryResponseType, e: TennisEvent) => Promise<void>,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => Promise<void>,
        doneCallback: (good: boolean) => Promise<void>) {
        this._process_common('atp', this._atp_events, this._fetch_atp_data.bind(this), eventCallback, matchCallback, async (good, newEvents) => {
            this._atp_events = newEvents;
            await doneCallback(good);
        });
    }

    private async _process_wta(eventCallback: (r: QueryResponseType, e: TennisEvent) => Promise<void>,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => Promise<void>,
        doneCallback: (good: boolean) => Promise<void>) {
        this._process_common('wta', this._wta_events, this._fetch_wta_data.bind(this), eventCallback, matchCallback, async (good, newEvents) => {
            this._wta_events = newEvents;
            await doneCallback(good);
        });
    }

    private _process_atp_challenger(eventCallback: (r: QueryResponseType, e: TennisEvent) => Promise<void>,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => Promise<void>,
        doneCallback: (good: boolean) => Promise<void>) {
        this._process_common('atp-challenger', this._atp_challenger_events, this._fetch_atp_challenger_data.bind(this), eventCallback, matchCallback, async (good, newEvents) => {
            this._atp_challenger_events = newEvents;
            await doneCallback(good);
        });
    }

    query(eventCallback: (r: QueryResponseType, e: TennisEvent) => Promise<void>,
        matchCallback: (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => Promise<void>,
        doneCallback: (allGood: boolean) => Promise<void>) {

        const tourHandlers = [
            this._process_atp.bind(this),
            this._process_atp_challenger.bind(this),
            this._process_wta.bind(this),
        ];

        let count = 0;
        const myDoneCallback = async (allGood: boolean) => {
            count += 1;
            if (count == tourHandlers.length) {
                this._log(['Query processing done']);
                if (doneCallback) {
                    await doneCallback(allGood);
                }
            }
        }

        tourHandlers.forEach(h => h(eventCallback, matchCallback, myDoneCallback));
    }

    disable() {
        this._atp_fetcher.disable();
        this._wta_fetcher.disable();
    }
};
