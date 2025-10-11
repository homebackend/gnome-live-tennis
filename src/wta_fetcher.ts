import Soup from "gi://Soup";
import { TennisEvent, TennisMatch, TennisPlayer, TennisSetScore, TennisTeam } from "./types";
import { stat } from "gi://GLib";

export class WtaFetcher {
    private static wta_all_events_url_template = 'https://api.wtatennis.com/tennis/tournaments/?page=0&pageSize=20&excludeLevels=ITF&from={from-date}&to={to-date}';
    private static wta_event_url_template = 'https://api.wtatennis.com/tennis/tournaments/{event-id}/{year}/matches?from={from-date}&to={to-date}';

    private _build_req: (url: string) => Soup.Message;
    private _data_fetcher: (msg: Soup.Message, handler: (json_data: any) => any) => void;

    constructor(build_req: (url: string) => Soup.Message, data_fetcher: (msg: Soup.Message, handler: (json_data: any) => any) => void) {
        this._build_req = build_req;
        this._data_fetcher = data_fetcher;
    }

    _replace_from_to_date(template: string) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        return template.replace('{from-date}', yesterday.toISOString().slice(0, 10)).replace('{to-date}', tomorrow.toISOString().slice(0, 10));
    }

    _get_all_events_url(): string {
        return this._replace_from_to_date(WtaFetcher.wta_all_events_url_template);
    }

    _get_event_url(eventId: string, year: number): string {
        const template = this._replace_from_to_date(WtaFetcher.wta_event_url_template);
        return template.replace('{event-id}', eventId).replace('{year}', year.toString());
    }

    _get_player(p: any, suffix: string): TennisPlayer {
        const firstName: string = p[`PlayerNameFirst${suffix}`];
        const lastName: string = p[`PlayerNameLast${suffix}`];
        return {
            id: p[`PlayerID${suffix}`],
            countryCode: p[`PlayerCountry${suffix}`],
            country: p[`PlayerCountry${suffix}`],
            firstName: firstName,
            lastName: lastName,
            headUrl: '',
            displayName: `${firstName} ${lastName}`,
        };
    }

    _get_players(t: any, matchType: string, team: string): TennisPlayer[] {
        const players: TennisPlayer[] = [];
        players.push(this._get_player(t, team));
        if (matchType !== 'S') {
            players.push(this._get_player(t, `${team}2`));
        }

        return players;
    }

    _get_set_scores(t: any, team: string): TennisSetScore[] {
        const setScores: TennisSetScore[] = [];

        for (let i = 1; i <= 5; i++) {
            setScores.push({
                score: t[`ScoreSet${i}${team}`],
                tiebrake: t[`ScoreTbSet${i}`],
                stats: undefined,
            });
        }

        return setScores;
    }

    _get_team_data(t: any, matchType: string, team: string): TennisTeam {
        const players: TennisPlayer[] = this._get_players(t, matchType, team);

        return {
            players: players,
            entryType: t[`EntryType${team}`],
            seed: t[`Seed${team}`],
            gameScore: t[`Point${team}`],
            setScores: this._get_set_scores(t, team),
            displayName: players.map(p => p.lastName).join('/'),
        };
    }

    _get_event_type_url(level: string): string | undefined {
        if (level == 'WTA 1000') {
            return 'https://www.wtatennis.com/resources/v7.8.3/i/elements/1000k-tag.svg';
        } else if (level == 'WTA 125') {
            return 'https://www.wtatennis.com/resources/v7.8.3/i/elements/125k-tag.svg'
        }
    }

    _get_round_name(roundId: string): string {
        if (roundId == 'Q') {
            return 'Quarterfinal';
        } else if (roundId == 'S') {
            return 'Semifinal';
        } else if (roundId == 'F') {
            return 'Final';
        }

        return roundId;
    }

    _get_match_status(status: string): string {
        if (status == 'U') {
            return 'Upcoming';
        } else if (status == 'F') {
            return 'Finished'
        } else if (status == 'P') {
            return 'Live';
        } else if (status == 'C') {
            return 'Paused';
        }

        return status;
    }

    _fetch_event_data(event: TennisEvent, events: any[], index: number, tennisEvents: TennisEvent[],
        callback: (tennisEvents: TennisEvent[]) => void) {
        const msg = this._build_req(this._get_event_url(event.id, event.year));
        this._data_fetcher(msg, json_data => {
            json_data['matches'].forEach((m: any) => {
                const team1 = this._get_team_data(m, m['DrawMatchType'], 'A');
                const team2 = this._get_team_data(m, m['DrawMatchType'], 'B');

                const tennisMatch: TennisMatch = {
                    id: m['MatchID'],
                    isDoubles: m['DrawMatchType'] !== 'S',
                    roundId: m['RoundID'],
                    roundName: this._get_round_name(m['RoundID']),
                    courtName: m['CourtName'],
                    courtId: m['CourtID'],
                    matchTotalTime: m['MatchTimeTotal'],
                    matchTimeStamp: m['MatchTimeStamp'],
                    matchStateReasonMessage: "",
                    message: "",
                    server: m['Serve'] == 'A' ? 0 : m['Serve'] == 'B' ? 1 : -1,
                    winnerId: -1,
                    umpireFirstName: "",
                    umpireLastName: "",
                    lastUpdate: "",
                    team1: team1,
                    team2: team2,
                    event: event,
                    status: m['MatchState'],
                    hasFinished: m['MatchState'] == 'F',
                    displayName: `${team1.displayName} vs ${team2.displayName}`,
                    displayStatus: this._get_match_status(m['MatchState']),
                    displayScore: m['ScoreString'],
                };

                event.matches.push(tennisMatch);
                event.matchMapping[tennisMatch.id] = tennisMatch;
            });

            this._process_event(events, index + 1, tennisEvents, callback);
        });
    }

    _process_event(events: any[], index: number, tennisEvents: TennisEvent[], callback: (tennisEvents: TennisEvent[]) => void) {
        if (index == events.length) {
            return callback(tennisEvents);
        }

        const e = events[index];
        const event: TennisEvent = {
            year: e['year'],
            id: String(e['tournamentGroup']['id']),
            name: e['tournamentGroup']['name'],
            title: e['title'],
            countryCode: '',
            country: e['country'],
            location: e['country'],
            city: e['city'],
            startDate: e['startDate'],
            endDate: e['endDate'],
            surface: e['surface'],
            indoor: e['inOutdoor'] == 1,
            type: e['level'],
            isLive: e['status'] == 'inProgress',
            tour: 'WTA',
            singlesDrawSize: e['singlesDrawSize'],
            doublesDrawSize: e['doublesDrawSize'],
            prizeMoney: e['prizeMoney'],
            prizeMoneyCurrency: e['prizeMoneyCurrency'],
            status: e['status'],
            matches: [],
            matchMapping: {},
            eventTypeUrl: this._get_event_type_url(e['level']),
        }

        tennisEvents.push(event);
        this._fetch_event_data(event, events, index, tennisEvents, callback);
    }

    fetchData(callback: (tennisEvents: TennisEvent[]) => void) {
        const msg = this._build_req(this._get_all_events_url());
        const tennisEvents: TennisEvent[] = [];

        this._data_fetcher(msg, json_data => {
            this._process_event(json_data['content'], 0, tennisEvents, callback);
        });
    }
}
