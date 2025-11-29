import { ApiCommonHeaders, ApiHandler, HttpMethods } from "./api";
import { Fetcher, FetcherCommon, FetcherProperties } from "./fetcher";
import { TennisEvent, TennisMatch, TennisPlayer, TennisSetScore, TennisTeam } from "./types";
import { generateUUIDv4 } from "./util";
import { Parser } from '../lib/htmlparser2/Parser';

enum ParsePosition {
    Top,
    Match,
    Team,
    PlayerName,
    SetScore,
    GameScore,
    PlayerFlag,
    PlayerServe,
    MatchExpectedTime,
}

export abstract class TTFetcher extends FetcherCommon implements Fetcher {
    private static _url = 'https://en.tennistemple.com';
    private static _responseCookies: string[] = ['PHPSESSID', 'device_id', 'device_key'];
    private static _tennisTempleId = 'b8852ab1-359d-490c-a900-77a044d2eb9d';

    private _log: (logs: string[]) => void;
    private _apiHandler: ApiHandler;
    private _deviceId = generateUUIDv4();
    private _deviceKey = generateUUIDv4();
    private _cookies?: Map<string, string>;

    constructor(apiHandler: ApiHandler, log: (logs: string[]) => void) {
        super();
        this._log = log;
        this._apiHandler = apiHandler;
    }

    protected abstract getFullUrl(relativeUrl: string, baseUrl: string): string;

    private async _getSessionCookies(): Promise<Map<string, string> | undefined> {
        if (this._cookies) {
            return this._cookies;
        }

        const [_, responseCookies] = await this._apiHandler.fetchString({
            url: TTFetcher._url,
            method: HttpMethods.GET,
            headers: new Map<string, string>(ApiCommonHeaders),
            responseCookies: TTFetcher._responseCookies,
        });

        this._cookies = responseCookies;
        return responseCookies;
    }

    private _getEvent(title: string, url: string): TennisEvent {
        return {
            year: new Date().getFullYear(),
            id: TTFetcher._tennisTempleId,
            title: title,
            countryCode: '',
            country: '',
            location: '',
            city: '',
            startDate: '',
            endDate: '',
            type: '',
            displayType: '',
            isLive: true,
            tour: '',
            matches: [],
            matchMapping: {},
            eventTypeUrl: '',
            name: title,
            surface: '',
            indoor: false,
            singlesDrawSize: -1,
            doublesDrawSize: -1,
            prizeMoney: -1,
            prizeMoneyCurrency: '',
            displayPrizeMoney: '',
            status: '',
            url: url,
            menuUrls: [],
        };
    }

    private _getMatch(isLive: boolean, event: TennisEvent): TennisMatch {
        return {
            id: "",
            placeholder: false,
            isDoubles: false,
            roundId: "",
            roundName: "",
            courtName: "",
            courtId: 0,
            matchTotalTime: "",
            matchTimeStamp: "",
            matchStateReasonMessage: "",
            message: "",
            status: "",
            server: 0,
            winnerId: 0,
            umpireFirstName: "",
            umpireLastName: "",
            lastUpdate: "",
            team1: this._getTeam(),
            team2: this._getTeam(),
            event: event,
            hasFinished: false,
            isLive: isLive,
            displayName: "",
            displayStatus: isLive ? 'Live' : 'Upcoming',
            displayScore: "",
            url: event.url,
            h2hUrl: ""
        };
    }

    private _getTeam(): TennisTeam {
        return {
            players: [this._getPlayer()],
            placeholder: false,
            entryType: '',
            seed: '',
            gameScore: '',
            setScores: [],
            displayName: '',
        };
    }

    private _getPlayer(): TennisPlayer {
        return {
            id: "",
            placeholder: false,
            countryCode: "",
            country: "",
            firstName: "",
            lastName: "",
            headUrl: undefined,
            displayName: "",
            slug: "",
            url: ""
        };
    }

    private _getSetScrore(score: string): TennisSetScore {
        return {
            score: +score,
            tiebrake: 0,
            stats: undefined
        };
    }

    private async _parseHtml(htmlString: string): Promise<TennisEvent[] | undefined> {
        const matches: TennisMatch[] = [];
        let currentMatch: TennisMatch;
        let currentEvent: TennisEvent;
        let currentTeam: TennisTeam;
        let currentTag = ParsePosition.Top;
        let currentTeamIndex = 0;
        let spanCount = 0;
        const fetcher = this;

        return new Promise<TennisEvent[] | undefined>(resolve => {
            const handler = {
                onopentag(name: string, attribs: { [key: string]: string }) {
                    if (currentTag == ParsePosition.Top) {
                        if (name === 'a') {
                            if (attribs['data-bubble']) {
                                currentEvent = fetcher._getEvent(attribs['data-bubble'], fetcher.getFullUrl(attribs.href, TTFetcher._url));
                            }

                            if (attribs.class.includes('hls_live_cont')) {
                                currentMatch = fetcher._getMatch(true, currentEvent);
                            } else {
                                currentMatch = fetcher._getMatch(false, currentEvent);
                            }

                            currentMatch.id = attribs.href;
                            currentMatch.event = currentEvent;
                            currentEvent.matches.push(currentMatch);
                            matches.push(currentMatch);
                            currentTag = ParsePosition.Match;
                        }
                    } else if (currentTag == ParsePosition.Match) {
                        if (name === 'span') {
                            if (attribs.class === 'hls_p_h' || attribs.class === 'hls_nm_m_p_t') {
                                currentTag = ParsePosition.Team;
                                currentTeam = fetcher._getTeam();
                                currentMatch.team1 = currentTeam;
                                currentTeamIndex = 0;
                            } else if (attribs.class == 'hls_p_l' || attribs.class === 'hls_nm_m_p_b') {
                                currentTag = ParsePosition.Team;
                                currentTeam = fetcher._getTeam();
                                currentMatch.team2 = currentTeam;
                                currentTeamIndex = 1;
                            }
                        }
                    } else if (currentTag == ParsePosition.Team) {
                        if (name == 'span') {
                            if (attribs.class.includes('hls_p_set')) {
                                currentTag = ParsePosition.SetScore;
                            } else if (attribs.class.includes('hls_p_game')) {
                                currentTag = ParsePosition.GameScore;
                            } else if (attribs.class.includes('hls_p_flag') || attribs.class.includes('hls2_p_flag')) {
                                const countryCode = attribs.class.replaceAll('hls_p_flag', '').replaceAll('hls2_p_flag', '').replaceAll('flag', '').trim();
                                currentTeam.players[0].countryCode = countryCode;
                                currentTeam.players[0].country = countryCode;
                                currentTag = ParsePosition.PlayerFlag;
                            } else if (attribs.class.includes('hls_p_name') || attribs.class.includes('hls_nm_p_name')) {
                                currentTag = ParsePosition.PlayerName;
                            } else if (attribs.class.includes('hls_p_serve_cont')) {
                                currentMatch.server = currentTeamIndex;
                                currentTag = ParsePosition.PlayerServe;
                                spanCount += 1;
                            } else if (attribs.class.includes('hls_nm_p_date') || attribs.class.includes('hls_nm_m_time')) {
                                currentTag = ParsePosition.MatchExpectedTime;
                            }
                        }
                    } else if (currentTag == ParsePosition.PlayerServe) {
                        spanCount += 1;
                    }
                },

                ontext(text: string) {
                    switch (currentTag) {
                        case ParsePosition.SetScore:
                            currentTeam.setScores.unshift(fetcher._getSetScrore(text.trim()));
                            break;
                        case ParsePosition.GameScore:
                            currentTeam.gameScore = text.trim();
                            break;
                        case ParsePosition.PlayerName:
                            const name = text.trim();
                            currentTeam.displayName = currentTeam.players[0].displayName = name;
                            if (name.includes(' ')) {
                                [currentTeam.players[0].lastName, currentTeam.players[0].firstName] = name.split(' ');
                            } else if (name.includes('.')) {
                                [currentTeam.players[0].firstName, currentTeam.players[0].lastName] = name.split('.');
                            } else {
                                currentTeam.players[0].firstName = currentTeam.players[0].lastName = name;
                            }
                            break;
                        case ParsePosition.MatchExpectedTime:
                            currentMatch.matchTimeStamp += ' ' + text.trim();
                            break;
                    }

                },

                onclosetag(name: string) {
                    if (name === 'span') {
                        switch (currentTag) {
                            case ParsePosition.SetScore:
                            case ParsePosition.GameScore:
                            case ParsePosition.PlayerName:
                            case ParsePosition.PlayerFlag:
                            case ParsePosition.MatchExpectedTime:
                                currentTag = ParsePosition.Team;
                                break;
                            case ParsePosition.PlayerServe:
                                if (spanCount >= 1) {
                                    if (spanCount == 1) {
                                        currentTag = ParsePosition.Team;
                                    }
                                    spanCount--;
                                }
                                break;
                            case ParsePosition.Team:
                                currentTag = ParsePosition.Match;
                                break;
                        }
                    } else if (name === 'a') {
                        currentTag = ParsePosition.Top;
                    }
                },

                onend() {
                    const event = fetcher._getEvent('Tennis Temple Live Matches', '');
                    event.id = TTFetcher._tennisTempleId;
                    event.matches = matches;
                    matches.forEach(match => {
                        match.displayScore = fetcher._formatSetScores(match.team1.setScores, match.team2.setScores);
                        event.matchMapping[match.id] = match;
                    });
                    resolve([event]);
                },

                onerror(error: any) {
                    fetcher._log(['Error during html parsing']);
                    if (error instanceof Error) {
                        fetcher._log(['Error', error.message]);
                    }

                    resolve(undefined);
                }
            };

            const parser = new Parser(handler);
            parser.write(htmlString);
            parser.end();
        });
    }

    private async _fetchAndParseData(properties: FetcherProperties): Promise<TennisEvent[] | undefined> {
        const responseCookies = await this._getSessionCookies();
        if (!responseCookies) {
            return undefined;
        }

        const headers = new Map<string, string>([
            ['content-type', 'application/x-www-form-urlencoded; charset=UTF-8'],
            ['origin', TTFetcher._url],
            ['referer', `${TTFetcher._url}/`],
            ['x-requested-with', 'XMLHttpRequest'],
        ]);

        ApiCommonHeaders.forEach((value, key) => headers.set(key, value));

        const cookies = new Map<string, string>([
            ['device_id', this._deviceId],
            ['device_key', this._deviceKey],
        ]);

        responseCookies.forEach((v, k) => cookies.set(k, v));

        const timestamp: number = Date.now();
        const data = new Map<string, any>([
            ['types', { user: 0, matchs: 1, match: 0, home: 0, comments: 0, device: 'desktop' }],
            ['timers', { ft_news: timestamp.toString(), ft_bet: timestamp.toString(), ft_players: timestamp.toString() }],
        ]);

        const [response] = await this._apiHandler.fetchJson({
            url: `${TTFetcher._url}/update.php`,
            method: HttpMethods.POST,
            headers: headers,
            cookies: cookies,
            payload: data,
        });

        if (!response) {
            this._log(['Empty response fot tennistemple.com']);
            return undefined;
        }

        const events = await this._parseHtml(response['matchs']['html']);

        return events;
    }

    fetchData(properties: FetcherProperties): Promise<TennisEvent[] | undefined> {
        return this._fetchAndParseData(properties);
    }

    disable(): void {
        this._apiHandler.abort();
    }
}

export class NodeTTFetcher extends TTFetcher {
    protected getFullUrl(relativeUrl: string, baseUrl: string): string {
        try {
            const absoluteUrl = new URL(relativeUrl, baseUrl);
            return absoluteUrl.toString();
        } catch (e) {
            console.log("Failed to resolve URI with GLib");
            return '';
        }
    }
}
