import { Settings } from "./settings.js";
import { TennisEvent, TennisMatch } from "./types.js";
import { SortedStringList } from "./util.js";

export abstract class Runner {
    protected log: (logs: string[]) => void;
    protected settings: Settings;
    protected basePath: string;
    private _tennisEvents: SortedStringList;
    private _tournamentMatches: Map<string, string[]> = new Map();
    private _manuallyDeselectedMatches: Set<string> = new Set();
    private _matchCompletionTimings: Map<String, Date> = new Map();

    public lastRefreshTime: number | undefined;

    constructor(log: (logs: string[]) => void, settings: Settings, basePath: string) {
        this.log = log;
        this.settings = settings;
        this.basePath = basePath;
        this._tennisEvents = new SortedStringList();
        this.setLastRefreshTime(undefined);
    }

    abstract updateLastRefreshTime(): void;
    abstract hasEvent(eventId: string): boolean;
    abstract addEventMenuItem(event: TennisEvent, text: string, position: number, url: string | undefined, isAuto: boolean): void;
    abstract hasMatch(matchId: string): boolean;
    abstract addMatchMenuItem(event: TennisEvent, match: TennisMatch, isSelected: boolean): void;
    abstract updateMatchMenuItem(matchId: string, match: TennisMatch): void;
    abstract isMatchSelected(matchId: string): boolean;
    abstract setMatchSelection(matchId: string, selection: boolean): void;
    abstract removeEventMenuItem(event: TennisEvent): void;
    abstract removeMatchMenuItem(matchId: string): void;
    abstract destroy(): void;

    protected lastRefreshTimeDisplay(): string {
        return this.lastRefreshTime ? new Date(this.lastRefreshTime).toTimeString().slice(0, 8) : 'N/A';
    }

    protected getIconPath(): string {
        return `${this.basePath}/icons/tennis-icon.png`;
    }

    public setLastRefreshTime(time: number | undefined) {
        this.lastRefreshTime = time;
        this.updateLastRefreshTime();
    }

    uniqMatchId(event: TennisEvent, match: TennisMatch): string {
        return `${event.id}-${match.id}`;
    }

    async addEvent(event: TennisEvent): Promise<void> {
        if (!this.hasEvent(event.id)) {
            this.log([`Adding tournament: ${event.title} (${event.id})`]);

            const position = this._tennisEvents.insert(event.title);
            const prizeMoney = event.displayPrizeMoney ? ` [${event.displayPrizeMoney}]` : '';
            const displayText = `${event.title}${prizeMoney}`;
            const eventTypeUrl = event.eventTypeUrl;
            const isAutoEvent = (await this.settings.getStrv('auto-view-new-matches')).includes(event.id);

            this.addEventMenuItem(event, displayText, position, eventTypeUrl, isAutoEvent)
        }
    }

    private async _shouldAutoSelectMatch(matchId: string, event: TennisEvent, match: TennisMatch): Promise<boolean> {
        if (this._manuallyDeselectedMatches.has(matchId)) {
            return false;
        }

        // Never select matches that are already over.
        if (match.hasFinished) {
            return false;
        }

        if (match.isLive && await this.settings.getBoolean('auto-select-live-matches')) {
            return true;
        }

        // If event is marked as auto select.
        const autoEvents = await this.settings.getStrv('auto-view-new-matches');
        if (autoEvents && autoEvents.length > 0 && autoEvents.includes(event.id)) {
            return true;
        }

        // If match involves players from configured list of countries
        const countries = await this.settings.getStrv('auto-select-country-codes');
        if (countries && countries.length > 0 &&
            ([...match.team1.players, ...match.team2.players].some(v => countries.includes(v.countryCode)))
        ) {
            return true;
        }

        const names = (await this.settings.getStrv('auto-select-player-names')).map(n => n.toLowerCase());
        if (names && names.length > 0 &&
            ([...match.team1.players, ...match.team2.players].some(
                v => names.includes(v.firstName.toLowerCase()) ||
                    names.includes(v.lastName.toLowerCase()) ||
                    names.some(n => v.displayName.includes(n))
            ))
        ) {
            return true;
        }

        return false;
    }

    async addMatch(event: TennisEvent, match: TennisMatch): Promise<void> {
        if (!this.hasMatch(this.uniqMatchId(event, match))) {
            this.log(['Adding match', event.title, match.displayName, match.id]);

            const matchId = this.uniqMatchId(event, match);
            let currentSelection = await this.settings.getStrv('selected-matches');
            if (!currentSelection.includes(matchId) && !match.hasFinished) {
                if (await this._shouldAutoSelectMatch(matchId, event, match)) {
                    this.log(['Auto selected', match.displayName]);
                    currentSelection.push(matchId);
                    await this.settings.setStrv('selected-matches', currentSelection);
                }
            }

            this.log([event.title, event.id, match.displayName, match.id, String(match.hasFinished), String(currentSelection.includes(matchId))]);

            this.addMatchMenuItem(event, match, currentSelection.includes(matchId))
            if (this._tournamentMatches.has(event.id)) {
                this._tournamentMatches.get(event.id)?.push(matchId);
            } else {
                this._tournamentMatches.set(event.id, [matchId]);
            }
        } else {
            this.updateMatch(event, match);
        }
    }

    async updateMatch(event: TennisEvent, match: TennisMatch): Promise<void> {
        this.log(['Updating match', event.title, event.id, match.displayName, match.id]);

        const matchId = this.uniqMatchId(event, match);
        this.updateMatchMenuItem(matchId, match);

        // If match is selected and match has finished
        if (this.isMatchSelected(matchId) && match.hasFinished) {
            // If menu item is checked means live view is enabled
            // stop selection after keep-completed-duration minutes
            const matchId = this.uniqMatchId(event, match);
            const now = new Date();
            if (this._matchCompletionTimings.has(matchId)) {
                if (now > this._matchCompletionTimings.get(matchId)!) {
                    this.log(['Match deselected']);
                    this.setMatchSelection(matchId, false);
                    await this._toggleMatchSelection(matchId);
                    this._matchCompletionTimings.delete(matchId);
                } else {
                    this.log(['Match will be deselected at', this._matchCompletionTimings.get(matchId)!.toString()]);
                }
            } else {
                this.log(['Match is selected, marking for deselection']);
                now.setMinutes(now.getMinutes() + await this.settings.getInt('keep-completed-duration'));
                this._matchCompletionTimings.set(matchId, now);
            }
        }
    }

    async removeEvent(event: TennisEvent): Promise<void> {
        this.log([`Removing tournament: ${event.title}`]);

        this._tennisEvents.remove(event.title);
        await this.filterAutoEvents(s => s !== event.id);

        this.removeEventMenuItem(event);

        if (this._tournamentMatches.has(event.id)) {
            let currentSelection = await this.settings.getStrv('selected-matches');
            currentSelection = currentSelection.filter(id => !this._tournamentMatches.get(event.id)?.includes(id));
            await this.settings.setStrv('selected-matches', currentSelection);

            this._tournamentMatches.get(event.id)?.forEach(matchId => {
                this.removeMatchMenuItem(matchId);
            });
            this._tournamentMatches.delete(event.id);
        }
    }

    async removeMatch(event: TennisEvent, match: TennisMatch) {
        this.log(['Removinging match', event.title, match.displayName]);

        const matchId = this.uniqMatchId(event, match);
        await this.filterLiveViewMatches(id => id !== matchId);
        this._manuallyDeselectedMatches.delete(matchId);
        this.removeMatchMenuItem(matchId);
    }

    isMatchWaitingDeselection(matchId: string): boolean {
        return this._matchCompletionTimings.has(matchId);
    }

    private async _toggleSetting(key: string, toggleValue: string): Promise<boolean> {
        let stored: boolean;
        let currentValues = await this.settings.getStrv(key);
        if (currentValues.includes(toggleValue)) {
            stored = false;
            currentValues = currentValues.filter(v => v !== toggleValue);
        } else {
            stored = true;
            currentValues.push(toggleValue);
        }
        await this.settings.setStrv(key, currentValues);
        return stored;
    }

    protected async _toggleAutoSelection(eventId: string): Promise<boolean> {
        return await this._toggleSetting('auto-view-new-matches', eventId);
    }

    protected async _toggleMatchSelection(matchId: string): Promise<boolean> {
        this._manuallyDeselectedMatches.add(matchId);
        return await this._toggleSetting('selected-matches', matchId);
    }

    private async _filterSetting(key: string, handler: (selection: string) => boolean): Promise<string[]> {
        let currentSelection = await this.settings.getStrv(key);
        currentSelection = currentSelection.filter(handler);
        await this.settings.setStrv(key, currentSelection);
        return currentSelection;
    }

    async filterLiveViewMatches(handler: (selection: string) => boolean): Promise<string[]> {
        return this._filterSetting('selected-matches', handler);
    }

    async filterAutoEvents(handler: (selection: string) => boolean): Promise<string[]> {
        return this._filterSetting('auto-view-new-matches', handler);
    }
};


