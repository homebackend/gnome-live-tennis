
export interface TennisPlayer {
    id: string;
    countryCode: string;
    country: string;
    firstName: string;
    lastName: string;
    headUrl: string | undefined;
    displayName: string;
    slug: string;
    url: string;
}

export interface TennisSetScore {
    score: number;
    tiebrake: number;
    stats: any;
}

export interface TennisTeam {
    players: TennisPlayer[];
    entryType: string;
    seed: string;
    gameScore: number;
    setScores: TennisSetScore[];
    displayName: string;
}

export interface TennisMatch {
    id: string;
    isDoubles: boolean;
    roundId: string;
    roundName: string;
    courtName: string;
    courtId: number;
    matchTotalTime: string;
    matchTimeStamp: string;
    matchStateReasonMessage: string;
    message: string;
    status: string;
    server: number;
    winnerId: number;
    umpireFirstName: string;
    umpireLastName: string;
    lastUpdate: string;
    team1: TennisTeam;
    team2: TennisTeam;
    event: TennisEvent;
    hasFinished: boolean;
    isLive: boolean;
    displayName: string;
    displayStatus: string;
    displayScore: string;
    h2hUrl: string,
}

export interface MenuUrl {
    title: string;
    url: string;
};

export interface TennisEvent {
    id: string;
    year: number;
    name: string;
    title: string;
    countryCode: string;
    country: string;
    location: string;
    city: string;
    startDate: string;
    endDate: string;
    surface: string;
    indoor: boolean;
    type: string;
    displayType: string;
    isLive: boolean;
    tour: string;
    singlesDrawSize: number;
    doublesDrawSize: number;
    prizeMoney: number;
    prizeMoneyCurrency: string;
    displayPrizeMoney: string;
    status: string;
    matches: TennisMatch[];
    matchMapping: { [key: string]: TennisMatch };
    eventTypeUrl: string | undefined;
    url: string;
    menuUrls: MenuUrl[];
}
