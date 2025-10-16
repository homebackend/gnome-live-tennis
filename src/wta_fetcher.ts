import Soup from "gi://Soup";
import { TennisEvent, TennisMatch, TennisPlayer, TennisSetScore, TennisTeam } from "./types";
import { stat } from "gi://GLib";

export class WtaFetcher {
    private static wta_all_events_url_template = 'https://api.wtatennis.com/tennis/tournaments/?page=0&pageSize=20&excludeLevels=ITF&from={from-date}&to={to-date}';
    private static wta_event_url_template = 'https://api.wtatennis.com/tennis/tournaments/{event-id}/{year}/matches?from={from-date}&to={to-date}';

    private _httpSession: Soup.Session | undefined;
    private _build_req: (url: string) => Soup.Message;
    private _data_fetcher: (session: Soup.Session, msg: Soup.Message, handler: (json_data: any) => any) => void;

    constructor(build_req: (url: string) => Soup.Message, data_fetcher: (session: Soup.Session, msg: Soup.Message, handler: (json_data: any) => any) => void) {
        this._httpSession = undefined;
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
        const firstName: string = p[`PlayerNameFirst${suffix}`] || 'TBD';
        const lastName: string = p[`PlayerNameLast${suffix}`] || 'TBD';
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
            displayName: players.map(p => p.lastName || 'TBD').join('/'),
        };
    }

    _get_event_type_url(level: string): string | undefined {
        switch (level) {
            case 'WTA 1000':
                return 'https://www.wtatennis.com/resources/v7.8.3/i/elements/1000k-tag.svg';
            case 'WTA 500':
                return 'https://www.wtatennis.com/resources/v7.8.3/i/elements/500k-tag.svg'
            case 'WTA 250':
                return 'https://www.wtatennis.com/resources/v7.8.3/i/elements/250k-tag.svg'
            case 'WTA 125':
                return 'https://www.wtatennis.com/resources/v7.8.3/i/elements/125k-tag.svg';
        }
    }

    _get_round_name_main_draw(event: TennisEvent, drawLevelType: string, roundId: string | number, matchState: string): string {
        if (typeof roundId == 'string') {
            switch (roundId) {
                case 'Q':
                    return 'Quarterfinal';
                case 'S':
                    return 'Semifinal';
                case 'F':
                    return 'Final';
            }

            roundId = parseInt(roundId, 10);
        }

        let roundOf: number;
        if (matchState == 'U') {
            roundOf = 2 ** roundId;
        } else {
            const drawSize = drawLevelType == 'D' ? event.doublesDrawSize : event.singlesDrawSize;
            let actualDrawSize: number = 2;
            while (drawSize > actualDrawSize) {
                actualDrawSize *= 2;
            }

            roundOf = actualDrawSize / (2 ** (roundId - 1));
        }

        switch (roundOf) {
            case 8:
                return 'Quarterfinal';
            case 4:
                return 'Semifinal';
            case 2:
                return 'Final';
        }

        return `Round of ${roundOf}`;
    }

    _get_round_name(event: TennisEvent, drawMatchType: string, drawLevelType: string, roundId: string | number, matchState: string): string {
        switch (drawLevelType) {
            case 'Q': // Qualifying (only doubles??)
                return `Qualifying(${drawMatchType})`;
            case 'M': // Main Draw (can be singles or doubles)
                return this._get_round_name_main_draw(event, drawLevelType, roundId, matchState);
        }

        return roundId.toString();
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
        } else if (status == 'S') {
            return 'Suspended';
        }

        return status;
    }

    _fetch_event_data(event: TennisEvent, events: any[], index: number, tennisEvents: TennisEvent[],
        callback: (tennisEvents: TennisEvent[]) => void) {
        this._httpSession = new Soup.Session();
        const msg = this._build_req(this._get_event_url(event.id, event.year));
        this._data_fetcher(this._httpSession, msg, json_data => {
            this._httpSession = undefined;

            json_data['matches'].forEach((m: any) => {
                const team1 = this._get_team_data(m, m['DrawMatchType'], 'A');
                const team2 = this._get_team_data(m, m['DrawMatchType'], 'B');
                const isDoubles = m['DrawMatchType'] !== 'S';

                const tennisMatch: TennisMatch = {
                    id: m['MatchID'],
                    isDoubles: isDoubles,
                    roundId: m['RoundID'],
                    roundName: this._get_round_name(event, m['DrawMatchType'], m['DrawLevelType'], m['RoundID'], m['MatchState']),
                    courtName: m['CourtName'],
                    courtId: m['CourtID'],
                    matchTotalTime: m['MatchTimeTotal'],
                    matchTimeStamp: m['MatchTimeStamp'],
                    matchStateReasonMessage: "",
                    message: m['FreeText'],
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
                    isLive: m['MatchState'] == 'P',
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
            displayType: e['level'],
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
        this._httpSession = new Soup.Session();
        const msg = this._build_req(this._get_all_events_url());
        const tennisEvents: TennisEvent[] = [];

        this._data_fetcher(this._httpSession, msg, json_data => {
            this._process_event(json_data['content'], 0, tennisEvents, callback);
            this._httpSession = undefined;
        });
    }

    disable() {
        if (this._httpSession) {
            this._httpSession.abort();
            this._httpSession = undefined;
        }
    }
}
