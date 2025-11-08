export interface Schema {
    enabled: boolean;
    auto_hide_no_live_matches: boolean;
    only_show_live_matches: boolean;
    update_interval: number;
    num_windows: number;
    match_display_duration: number;
    selected_matches: string[];
    auto_view_new_matches: string[];
    auto_select_live_matches: boolean;
    auto_select_country_codes: string[];
    auto_select_player_names: string[];
    keep_completed_duration: number;
    enable_atp: boolean;
    enable_wta: boolean;
    enable_atp_challenger: boolean;
    live_window_size_x: number;
    live_window_size_y: number;
    enable_debug_logging: boolean;
}

interface FullSchemaItem {
    type: string;
    default?: any;
    items?: { type: string, enum?: string },
    summary?: string;
    description?: string;
    minimum?: number;
    maximum?: number;
}

export interface FullSchema {
    [key: string]: FullSchemaItem;
}

export const schema: FullSchema = {
    enabled: {
        type: 'boolean',
        default: false,
        summary: 'Enable floating windows',
        description: 'Whether to show floating score windows for selected matches.',
    },
    auto_hide_no_live_matches: {
        type: 'boolean',
        default: true,
        summary: 'Enable auto hiding',
        description: 'Whether to hide Live Score Window when no matches are live.',
    },
    only_show_live_matches: {
        type: 'boolean',
        default: true,
        summary: 'Only show live matches',
        description: 'Only show live matches in Live View Window.',
    },
    update_interval: {
        type: 'number',
        default: 15,
        summary: 'Data update interval',
        description: 'The interval in seconds at which to fetch new match data.',
    },
    num_windows: {
        type: 'number',
        default: 1,
        summary: 'Number of floating windows',
        description: 'The maximum number of floating windows to display at once.',
    },
    match_display_duration: {
        type: 'number',
        default: 10,
        summary: 'Match display duration',
        description: 'The duration in seconds to display a single match before cycling to the next one, if multiple are selected.',
    },
    selected_matches: {
        type: 'array',
        items: {
            type: 'string',
        },
        default: [],
        summary: 'Selected match IDs',
        description: 'An array of match IDs for which to display floating windows.',
    },
    auto_view_new_matches: {
        type: 'array',
        items: {
            type: 'string',
        },
        default: [],
        summary: 'Selected event IDs',
        description: 'An array of event IDs for new matches are automatically added to live view.'
    },
    auto_select_live_matches: {
        type: 'boolean',
        default: false,
        summary: 'Auto select live matchs',
        description: 'Whether to automatically select matches currently in progress.',
    },
    auto_select_country_codes: {
        type: 'array',
        items: {
            type: 'string',
            enum: 'country',
        },
        default: [],
        summary: 'Auto select countries',
        description: 'Auto select matches from these countries.',
    },
    auto_select_player_names: {
        type: 'array',
        items: {
            type: 'string',
        },
        default: [],
        summary: 'Auto select Player Names',
        description: 'A comma-separated list of player names. Each name must contain only alphabetic characters. The name could be first name or last name.',
    },
    keep_completed_duration: {
        type: 'number',
        default: 30,
        summary: 'Keep completed matches duration',
        description: 'The duration in minutes to keep matches visible after they have finished.',
    },
    enable_atp: {
        type: 'boolean',
        default: true,
        summary: 'Enable ATP tour',
        description: 'Process events and matches from ATP tour.',
    },
    enable_wta: {
        type: 'boolean',
        default: true,
        summary: 'Enable WTA tour',
        description: 'Process events and matches from WTA tour.',
    },
    enable_atp_challenger: {
        type: 'boolean',
        default: false,
        summary: 'Enable ATP Challenger tour',
        description: 'Process events and matches from ATP Challenger tour.',
    },
    live_window_size_x: {
        type: 'number',
        default: 450,
        summary: 'Live view window width',
        description: 'Width in pixels of Live view window (between 200 and 600).',
        minimum: 200,
        maximum: 600,
    },
    live_window_size_y: {
        type: 'number',
        default: 400,
        summary: 'Live view window height',
        description: 'Height in pixels of Live view window (between 200 and 600).',
        minimum: 200,
        maximum: 600,
    },
    enable_debug_logging: {
        type: 'boolean',
        default: false,
        summary: 'Enable Debug Logging',
        description: 'Enables debug logging. Only helpful if you are developing.',
    },
};

export interface PrefSchema {
    title: string,
    description: string,
    properties: Array<keyof Schema>,
}

export const prefs: PrefSchema[] = [{
    title: 'Enable tours',
    description: 'Control which tours are enabled and processed.',
    properties: ['enable_atp', 'enable_wta', 'enable_atp_challenger'],
}, {
    title: 'Live Score Window',
    description: 'Control Live Score Window behaviour',
    properties: ['live_window_size_x', 'live_window_size_y', 'auto_hide_no_live_matches', 'only_show_live_matches', 'keep_completed_duration'],
}, {
    title: 'Live View Match Selection',
    description: 'Control how Live View match selection works.',
    properties: ['auto_select_live_matches', 'auto_select_country_codes', 'auto_select_player_names'],
}, {
    title: 'Developer Options',
    description: 'Control developer mode used to debug this extension.',
    properties: ['enable_debug_logging'],
}];
