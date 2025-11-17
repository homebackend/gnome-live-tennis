import { TennisEvent, TennisMatch, TennisPlayer, TennisSetScore, TennisTeam } from "./types.js";
import { ApiCommonHeaders, ApiHandler, HttpMethods } from "./api.js";
import { Fetcher, FetcherCommon, FetcherProperties } from "./fetcher.js";

export interface AtpFetcherProperties extends FetcherProperties {
    tour: string;
}

export class AtpFetcher extends FetcherCommon implements Fetcher {
    private static atp_url = 'https://app.atptour.com/api/v2/gateway/livematches/website?scoringTournamentLevel=tour';
    private static atp_challenger_url = 'https://app.atptour.com/api/v2/gateway/livematches/website?scoringTournamentLevel=challenger';

    private _apiHandler: ApiHandler;

    constructor(apiHandler: ApiHandler) {
        super();
        this._apiHandler = apiHandler;
    }

    private _get_player_data(p: any): TennisPlayer {
        const id = p["PlayerId"];
        const firstName = p["PlayerFirstName"];
        const lastName = p["PlayerLastName"];
        const slug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
        return {
            id: p["PlayerId"],
            countryCode: p["PlayerCountry"],
            country: p["PlayerCountryName"],
            firstName: firstName,
            lastName: lastName,
            headUrl: `https://www.atptour.com/-/media/alias/player-headshot/${p["PlayerId"]}`,
            displayName: `${p["PlayerFirstName"]} ${p["PlayerLastName"]}`,
            slug: slug,
            url: `https://www.atptour.com/en/players/${slug}/${id}/overview`
        };
    }

    private _get_set_score(s: any): TennisSetScore {
        return {
            score: s['SetScore'],
            tiebrake: s['TieBreakScore'],
            stats: s['Stats']
        };
    }

    private _get_set_scores(t: any): TennisSetScore[] {
        let scores: TennisSetScore[] = [];
        t['SetScores'].forEach((s: any) => {
            scores.push(this._get_set_score(s));
        });
        return scores;
    };

    private _get_atp_team_data(t: any, matchType: string): TennisTeam {
        const players: TennisPlayer[] = [];
        players.push(this._get_player_data(t['Player']));
        if (matchType == 'doubles') {
            players.push(this._get_player_data(t['Partner']));
        }

        return {
            players: players,
            entryType: t['EntryType'],
            seed: t['Seed'],
            gameScore: String(t['GameScore']),
            setScores: this._get_set_scores(t),
            displayName: players.map(p => p.lastName).join('/'),
        };
    }

    private _get_display_type(tour: string, eventType: string) {
        if (tour == 'ATP') {
            return `ATP ${eventType}`;
        } else {
            if (eventType == 'CH') {
                return `ATP Challenger`;
            } else {
                return `ATP ${eventType}`;
            }
        }
    }

    private _get_event_type_url(tour: string, eventType: string) {
        if (tour == 'ATP') {
            return ["1000", "500", "250"].includes(eventType) ? `https://www.atptour.com/assets/atpwt/images/tournament/badges/categorystamps_${eventType}.png` : undefined;
        } else {
            if (eventType == 'CH') {
                return 'http://www.atptour.com/assets/atpwt/images/tournament/badges/categorystamps_ch.png';
            }
        }
    }

    private _get_match_display_status(ms: string): string {
        let status: string = '';
        if (ms == "F") {
            status = 'Finished';
        } else if (ms == "P") {
            status = 'Live';
        } else if (["C", "D", "M", "W"].includes(ms)) {
            // C -> 
            // D -> Delay
            // M -> 
            // W -> Warming up
            status = 'Paused';
        } else {
            status = ms;
        }

        return status;
    }

    private _getEvents(properties: AtpFetcherProperties, jsonData: any): TennisEvent[] {
        const tennisEvents: TennisEvent[] = [];
        const jsonEvents = jsonData['Data']['LiveMatchesTournamentsOrdered'];
        jsonEvents.forEach((e: any) => {
            const matches: TennisMatch[] = [];
            const matchMapping: { [key: string]: TennisMatch } = {};

            const id = e["EventId"];
            const name = e["EventTitle"];
            const year = e["EventYear"];
            const url = `https://www.atptour.com/en/tournaments/${name.toLowerCase()}/${id}/overview`;
            const resultUrl = `https://www.atptour.com/en/scores/current/${name.toLowerCase()}/${id}/results`;
            const drawUrl = `https://www.atptour.com/en/scores/current/${name.toLowerCase()}/${id}/draws`;
            const scheduleUrl = `https://www.atptour.com/en/scores/current/${name.toLowerCase()}/${id}/daily-schedule`;
            const seedsUrl = `https://www.atptour.com/en/scores/current/${name.toLowerCase()}/${id}/top-seeds`;

            const event: TennisEvent = {
                year: year,
                id: String(id),
                title: e["EventTitle"],
                countryCode: e["EventCountryCode"],
                country: e["EventCountry"],
                location: e["EventLocation"],
                city: e["EventCity"],
                startDate: e["EventStartDate"],
                endDate: e["EventEndDate"],
                type: e["EventType"],
                displayType: this._get_display_type(properties.tour, e["EventType"]),
                isLive: e["IsLive"],
                tour: properties.tour,
                matches: matches,
                matchMapping: matchMapping,
                eventTypeUrl: this._get_event_type_url(properties.tour, e["EventType"]),
                name: name,
                surface: "",
                indoor: false,
                singlesDrawSize: -1,
                doublesDrawSize: -1,
                prizeMoney: -1,
                prizeMoneyCurrency: "",
                displayPrizeMoney: "",
                status: "",
                url: url,
                menuUrls: [{
                    title: 'Overview',
                    url: url,
                }, {
                    title: 'Results',
                    url: resultUrl,
                }, {
                    title: 'Draw',
                    url: drawUrl,
                }, {
                    title: 'Schedule',
                    url: scheduleUrl,
                }, {
                    title: 'Seeds',
                    url: seedsUrl,
                }],
            };

            tennisEvents.push(event);

            e['LiveMatches'].forEach((m: any) => {
                const matchType = m['Type'];
                const team1 = this._get_atp_team_data(m['PlayerTeam'], matchType);
                const team2 = this._get_atp_team_data(m['OpponentTeam'], matchType);
                const isDoubles = m['IsDoubles'];
                const mid = m['MatchId'];
                const isLive = m['MatchStatus'] == 'P';
                const hasFinished = m['MatchStatus'] == 'F';
                const matchUrl = `https://www.atptour.com/en/scores/stats-centre/${hasFinished ? 'archive' : 'live'}/${year}/${id}/${mid}`;

                const match: TennisMatch = {
                    id: mid,
                    isDoubles: isDoubles,
                    roundName: m['RoundName'],
                    courtName: m['CourtName'],
                    courtId: m['CourtId'],
                    matchTotalTime: m['MatchTimeTotal'],
                    matchStateReasonMessage: m['MatchStateReasonMessage'],
                    message: m['ExtendedMessage'],
                    status: m['MatchStatus'],
                    server: m['ServerTeam'],
                    winnerId: m['WinningPlayerId'],
                    umpireFirstName: m['UmpireFirstName'],
                    umpireLastName: m['UmpireLastName'],
                    lastUpdate: m['LastUpdated'],
                    team1: team1,
                    team2: team2,
                    event: event,
                    hasFinished: hasFinished,
                    isLive: isLive,
                    displayName: `${team1.displayName} vs ${team2.displayName}`,
                    displayStatus: this._get_match_display_status(m['MatchStatus']),
                    displayScore: this._formatSetScores(team1.setScores, team2.setScores),
                    roundId: m['RoundName'],
                    matchTimeStamp: "",
                    url: matchUrl,
                    h2hUrl: isDoubles ? '' : `https://www.atptour.com/en/players/atp-head-2-head/${team1.players[0].slug}-vs-${team2.players[0].slug}/${team1.players[0].id}/${team2.players[0].id}`,
                };
                matches.push(match);
                matchMapping[m['MatchId']] = match;
            });
        });

        return tennisEvents;
    }

    async fetchData(properties: AtpFetcherProperties): Promise<TennisEvent[] | undefined> {
        const [jsonData] = await this._apiHandler.fetchJson({
            url: properties.tour == 'ATP' ? AtpFetcher.atp_url : AtpFetcher.atp_challenger_url,
            method: HttpMethods.GET,
            headers: ApiCommonHeaders,
        });

        if (!jsonData) {
            return undefined;
        }

        return this._getEvents(properties, jsonData);
    }

    disable() {
        this._apiHandler.abort();
    }
}
