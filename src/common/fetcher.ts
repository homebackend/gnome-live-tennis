// src/fetcher.ts

import { TennisEvent, TennisMatch, TennisSetScore } from "./types.js";
import { AtpFetcher } from "./atp_fetcher.js";
import { WtaFetcher } from "./wta_fetcher.js";
import { Settings } from "./settings.js";
import { TTFetcher } from "./tt_fetcher.js";

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

export interface FetcherProperties {
}

export interface Fetcher {
    fetchData(properties: FetcherProperties): Promise<TennisEvent[] | undefined>;
    disable(): void;
}

export abstract class FetcherCommon {
    protected _formatSetScores(team1Scores: TennisSetScore[], team2Scores: TennisSetScore[]): string {
        if (!team1Scores || !team2Scores || team1Scores.length === 0 || team2Scores.length === 0) {
            return '';
        }

        const scores: string[] = [];
        for (let i = 0; i < team1Scores.length && i < team2Scores.length; i++) {
            const score1 = team1Scores[i].score;
            const score2 = team2Scores[i].score;

            if (score1 === undefined || score1 === null || score2 === undefined || score2 === null) {
                continue;
            }

            let scoreString = `${score1}-${score2}`;

            const tiebreak1 = team1Scores[i].tiebrake;
            const tiebreak2 = team2Scores[i].tiebrake;
            if (tiebreak1 || tiebreak2) {
                const tiebreakScore = tiebreak1 || tiebreak2;
                scoreString += `(${tiebreakScore})`;
            }

            scores.push(scoreString);
        }
        return scores.join(', ');
    }
}

interface TourData {
    settingKey: string,
    fetcher: () => Promise<TennisEvent[] | undefined>,
    lock: boolean,
    eventMap: StringToTennisEventMap,
    disabler: () => void;
}

export class LiveTennis {
    private _tourData: TourData[];
    private _log: (logs: string[]) => void;
    private _settings: Settings;

    constructor(log: (logs: string[]) => void, settings: Settings, atp_fetcher: AtpFetcher, wta_fetcher: WtaFetcher, tt_fetcher: TTFetcher) {
        this._tourData = [{
            settingKey: 'atp',
            fetcher: atp_fetcher.fetchData.bind(atp_fetcher, { tour: 'ATP' }),
            lock: false,
            eventMap: {},
            disabler: atp_fetcher.disable.bind(atp_fetcher),
        }, {
            settingKey: 'atp-challenger',
            fetcher: atp_fetcher.fetchData.bind(atp_fetcher, { tour: 'ATP-Challenger' }),
            lock: false,
            eventMap: {},
            disabler: atp_fetcher.disable.bind(atp_fetcher),
        }, {
            settingKey: 'wta',
            fetcher: wta_fetcher.fetchData.bind(wta_fetcher, {}),
            lock: false,
            eventMap: {},
            disabler: wta_fetcher.disable.bind(wta_fetcher),
        }, {
            settingKey: 'tennis-temple',
            fetcher: tt_fetcher.fetchData.bind(tt_fetcher, {}),
            lock: false,
            eventMap: {},
            disabler: tt_fetcher.disable.bind(tt_fetcher),
        }];

        this._log = log;
        this._settings = settings;
    }

    private async _process(tourData: TourData): Promise<[StringToTennisEventMap, StringToTennisEventMap | undefined]> {
        const oldEventsMap = tourData.eventMap;
        if (await this._settings.getBoolean(`enable-${tourData.settingKey}`)) {
            if (tourData.lock) {
                return [oldEventsMap, oldEventsMap];
            }

            tourData.lock = true;
            const newEvents = await tourData.fetcher();
            tourData.lock = false;
            if (!newEvents) {
                this._log([`Fetch received no data`]);
                return [oldEventsMap, undefined];
            }

            const newEventsMap: StringToTennisEventMap = {};
            tourData.eventMap = newEventsMap;
            newEvents.forEach(e => newEventsMap[e.id] = e);
            return [oldEventsMap, newEventsMap];
        } else {
            return [oldEventsMap, undefined];
        }
    }

    private async _trackPromise<T>(promise: Promise<T>, id: number): Promise<{ id: number, data: T }> {
        return promise.then(data => ({ id, data }));
    }

    async *query(): AsyncGenerator<[QueryResponseType, TennisEvent, TennisMatch?], boolean, void> {
        const pendingPromises = new Map<number, Promise<{ id: number, data: [StringToTennisEventMap, StringToTennisEventMap | undefined] }>>();
        this._tourData.forEach(tourData => {
            const size = pendingPromises.size;
            pendingPromises.set(size, this._trackPromise(this._process(tourData), size));
        })

        let failed = false;

        while (pendingPromises.size > 0) {
            const { id, data } = await Promise.race(Array.from(pendingPromises.values()));

            if (data) {
                const [oldEventsMap, newEventsMap] = data;
                // If both old and new objects are same: this means a query is already in progress
                // so we do nothing and yield nothing, but mark request as failed since that will
                // prevent old event/match cleanup elsewhere in the code.
                if (oldEventsMap === newEventsMap) {
                    failed = true;
                } else {
                    if (newEventsMap) {
                        for (const [eventId, oldEvent] of Object.entries(oldEventsMap)) {
                            if (!(eventId in newEventsMap)) {
                                yield [QueryResponseType.DeleteTournament, oldEvent];
                            } else {
                                const newEvent = newEventsMap[eventId];
                                for (const [matchId, oldMatch] of Object.entries(oldEvent.matchMapping)) {
                                    if (!(matchId in newEvent.matchMapping)) {
                                        yield [QueryResponseType.DeleteMatch, oldEvent, oldMatch];
                                    }
                                }
                            }
                        }

                        for (const [eventId, newEvent] of Object.entries(newEventsMap)) {
                            if (!(eventId in oldEventsMap)) {
                                yield [QueryResponseType.AddTournament, newEvent];
                                for (const match of newEvent.matches) {
                                    yield [QueryResponseType.AddMatch, newEvent, match];
                                }
                            } else {
                                yield [QueryResponseType.UpdateTournament, newEvent];
                                const oldEvent = oldEventsMap[eventId];
                                for (const [matchId, newMatch] of Object.entries(newEvent.matchMapping)) {
                                    if (!(matchId in oldEvent.matchMapping)) {
                                        yield [QueryResponseType.AddMatch, newEvent, newMatch];
                                    } else {
                                        yield [QueryResponseType.UpdateMatch, newEvent, newMatch];
                                    }
                                }
                            }
                        }
                    } else {
                        failed = true;
                    }
                }
            } else {
                failed = true;
            }

            pendingPromises.delete(id);
        }

        return failed;
    }

    disable() {
        this._tourData.forEach(tourData => tourData.disabler());
    }
};
