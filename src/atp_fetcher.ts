import Soup from "gi://Soup";
import { TennisEvent, TennisMatch, TennisPlayer, TennisSetScore, TennisTeam } from "./types";

export class AtpFetcher {
    private static atp_url = 'https://app.atptour.com/api/v2/gateway/livematches/website?scoringTournamentLevel=tour';
    private static atp_challenger_url = 'https://app.atptour.com/api/v2/gateway/livematches/website?scoringTournamentLevel=challenger';

    private _httpSession: Soup.Session | undefined;
    private _build_req: (url: string) => Soup.Message;
    private _data_fetcher: (session: Soup.Session, msg: Soup.Message, handler: (json_data: any) => any) => void;

    constructor(build_req: (url: string) => Soup.Message, data_fetcher: (session: Soup.Session, msg: Soup.Message, handler: (json_data: any) => any) => void) {
        this._httpSession = undefined;
        this._build_req = build_req;
        this._data_fetcher = data_fetcher;
    }

    private _get_player_data(p: any): TennisPlayer {
        return {
            id: p["PlayerId"],
            countryCode: p["PlayerCountry"],
            country: p["PlayerCountryName"],
            firstName: p["PlayerFirstName"],
            lastName: p["PlayerLastName"],
            headUrl: `https://www.atptour.com/-/media/alias/player-headshot/${p["PlayerId"]}`,
            displayName: `${p["PlayerFirstName"]} ${p["PlayerLastName"]}`,
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

    private _formatSetScores(team1Scores: TennisSetScore[], team2Scores: TennisSetScore[]): string {
        if (!team1Scores || !team2Scores || team1Scores.length === 0 || team2Scores.length === 0) {
            return '';
        }

        const scores: string[] = [];
        for (let i = 0; i < team1Scores.length && i < team2Scores.length; i++) {
            const score1 = team1Scores[i].score;
            const score2 = team2Scores[i].score;

            if (!score1 || !score2) {
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
            gameScore: t['GameScore'],
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

    fetchData(tour: string, callback: (tennisEvents: TennisEvent[] | undefined) => void) {
        this._httpSession = new Soup.Session();
        const msg = this._build_req(tour == 'ATP' ? AtpFetcher.atp_url : AtpFetcher.atp_challenger_url);
        const tennisEvents: TennisEvent[] = [];

        this._data_fetcher(this._httpSession, msg, jsonData => {
            this._httpSession = undefined;

            if (jsonData == null) {
                return callback(undefined);
            }

            const jsonEvents = jsonData['Data']['LiveMatchesTournamentsOrdered'];
            jsonEvents.forEach((e: any) => {
                const matches: TennisMatch[] = [];
                const matchMapping: { [key: string]: TennisMatch } = {};

                const event: TennisEvent = {
                    year: e["EventYear"],
                    id: String(e["EventId"]),
                    title: e["EventTitle"],
                    countryCode: e["EventCountryCode"],
                    country: e["EventCountry"],
                    location: e["EventLocation"],
                    city: e["EventCity"],
                    startDate: e["EventStartDate"],
                    endDate: e["EventEndDate"],
                    type: e["EventType"],
                    displayType: this._get_display_type(tour, e["EventType"]),
                    isLive: e["IsLive"],
                    tour: tour,
                    matches: matches,
                    matchMapping: matchMapping,
                    eventTypeUrl: this._get_event_type_url(tour, e["EventType"]),
                    name: e["EventTitle"],
                    surface: "",
                    indoor: false,
                    singlesDrawSize: -1,
                    doublesDrawSize: -1,
                    prizeMoney: -1,
                    prizeMoneyCurrency: "",
                    displayPrizeMoney: "",
                    status: ""
                };

                tennisEvents.push(event);

                e['LiveMatches'].forEach((m: any) => {
                    const matchType = m['Type'];
                    const team1 = this._get_atp_team_data(m['PlayerTeam'], matchType);
                    const team2 = this._get_atp_team_data(m['OpponentTeam'], matchType);

                    const match: TennisMatch = {
                        id: m['MatchId'],
                        isDoubles: m['IsDoubles'],
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
                        hasFinished: m['MatchStatus'] == 'F',
                        isLive: m['MatchStatus'] == 'P',
                        displayName: `${team1.displayName} vs ${team2.displayName}`,
                        displayStatus: this._get_match_display_status(m['MatchStatus']),
                        displayScore: this._formatSetScores(team1.setScores, team2.setScores),
                        roundId: m['RoundName'],
                        matchTimeStamp: ""
                    };
                    matches.push(match);
                    matchMapping[m['MatchId']] = match;
                });
            });

            callback(tennisEvents);
        });
    }

    disable() {
        if (this._httpSession) {
            this._httpSession.abort();
            this._httpSession = undefined;
        }
    }
}
