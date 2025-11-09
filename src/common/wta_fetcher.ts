//import Soup from "gi://Soup";
import { TennisEvent, TennisMatch, TennisPlayer, TennisSetScore, TennisTeam } from "./types.js";
import { ApiCommonHeaders, ApiHandler, HttpMethods } from "./api.js";

export class WtaFetcher {
    private static wta_all_events_url_template = 'https://api.wtatennis.com/tennis/tournaments/?page=0&pageSize=20&excludeLevels=ITF&from={from-date}&to={to-date}';
    private static wta_event_url_template = 'https://api.wtatennis.com/tennis/tournaments/{event-id}/{year}/matches?from={from-date}&to={to-date}';

    private _apiHandler: ApiHandler;

    constructor(apiHandler: ApiHandler) {
        this._apiHandler = apiHandler;
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
        const id = p[`PlayerID${suffix}`];
        const slug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
        const url = firstName != 'TBD' && lastName != 'TBD' ? `https://www.wtatennis.com/players/${id}/${slug}` : '';
        return {
            id: id,
            countryCode: p[`PlayerCountry${suffix}`],
            country: p[`PlayerCountry${suffix}`],
            firstName: firstName,
            lastName: lastName,
            headUrl: '',
            displayName: `${firstName} ${lastName}`,
            url: url,
            slug: slug,
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

    _get_set_scores(t: any, team: string, other: string): TennisSetScore[] {
        const setScores: TennisSetScore[] = [];

        for (let i = 1; i <= 5; i++) {
            const teamScore = t[`ScoreSet${i}${team}`];
            const otherScore = t[`ScoreSet${i}${other}`];
            setScores.push({
                score: teamScore,
                tiebrake: teamScore < otherScore ? t[`ScoreTbSet${i}`] : undefined,
                stats: undefined,
            });
        }

        return setScores;
    }

    _get_team_data(t: any, matchType: string, team: string, other: string): TennisTeam {
        const players: TennisPlayer[] = this._get_players(t, matchType, team);

        return {
            players: players,
            entryType: t[`EntryType${team}`],
            seed: t[`Seed${team}`],
            gameScore: t[`Point${team}`],
            setScores: this._get_set_scores(t, team, other),
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

    _get_human_readable_prize_money(prizeMoney: number): string {
        if (Math.abs(prizeMoney) < 1000) {
            return prizeMoney.toString();
        }

        const formatter = new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1, // Adjust decimal places as needed
        });
        return formatter.format(prizeMoney);
    }

    _fetch_event_data(event: TennisEvent, events: any[], index: number, tennisEvents: TennisEvent[],
        callback: (tennisEvents: TennisEvent[]) => void) {

        this._apiHandler.fetchJson(this._get_event_url(event.id, event.year),
            HttpMethods.GET, ApiCommonHeaders, (jsonData => {
                jsonData['matches'].forEach((m: any) => {
                    const team1 = this._get_team_data(m, m['DrawMatchType'], 'A', 'B');
                    const team2 = this._get_team_data(m, m['DrawMatchType'], 'B', 'A');
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
                        h2hUrl: isDoubles ? '' : `https://www.wtatennis.com/head-to-head/${team1.players[0].id}/${team2.players[0].id}`,
                    };

                    event.matches.push(tennisMatch);
                    event.matchMapping[tennisMatch.id] = tennisMatch;
                });

                this._process_event(events, index + 1, tennisEvents, callback);
            }),
        );
    }

    _process_event(events: any[], index: number, tennisEvents: TennisEvent[], callback: (tennisEvents: TennisEvent[]) => void) {
        if (index == events.length) {
            return callback(tennisEvents);
        }

        const e = events[index];
        const year = e['year'];
        const id = e['tournamentGroup']['id'];
        const name = e['tournamentGroup']['name'];
        const url = `https://www.wtatennis.com/tournaments/${id}/${name.toLowerCase().replace(' ', '-')}/${year}`;
        const event: TennisEvent = {
            year: year,
            id: String(id),
            name: name,
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
            displayPrizeMoney: `${e['prizeMoneyCurrency']} ${this._get_human_readable_prize_money(e['prizeMoney'])}`,
            status: e['status'],
            matches: [],
            matchMapping: {},
            eventTypeUrl: this._get_event_type_url(e['level']),
            url: url,
            menuUrls: [{
                title: 'Overview',
                url: url,
            }],
        }

        tennisEvents.push(event);
        this._fetch_event_data(event, events, index, tennisEvents, callback);
    }

    fetchData(callback: (tennisEvents: TennisEvent[] | undefined) => void) {
        const tennisEvents: TennisEvent[] = [];
        this._apiHandler.fetchJson(this._get_all_events_url(), HttpMethods.GET, ApiCommonHeaders, (jsonData => {
            if (jsonData == null) {
                return callback(undefined);
            }

            this._process_event(jsonData['content'], 0, tennisEvents, callback);
        }));
    }

    disable() {
        this._apiHandler.abort();
    }
}
