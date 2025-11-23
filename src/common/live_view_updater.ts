import { LiveTennis, QueryResponseType } from "./fetcher";
import { Runner } from "./runner";
import { Settings } from "./settings";
import { TennisMatch } from "./types";
import { AtpFetcher } from "./atp_fetcher";
import { ApiHandler } from "./api";
import { WtaFetcher } from "./wta_fetcher";
import { TTFetcher } from "./tt_fetcher";

export interface LiveViewManager {
    setFetchTimer(interval: number, fetcher: () => void): void;
    unsetFetchTimer(): void;
    getLiveViewCount(): number;
    setLiveViewCount(numWindows: number): Promise<void>
    updateLiveViewContent(window: number, match: TennisMatch): void;
    setLiveViewContentsEmpty(window: number): void;
    hideLiveViews(): void;
    destroyLiveView(): void;
    setCycleTimeout(interval: number, cycler: () => Promise<boolean>): void;
    destroyCycleTimeout(): void;
    removeCycleTimeout(): boolean;
    continueCycleTimeout(): boolean;
};

export interface ApiHandlers {
    atp: ApiHandler,
    wta: ApiHandler,
    tt: ApiHandler,
}

export class LiveViewUpdater<TF extends TTFetcher> {
    private _runner: Runner;
    private _manager: LiveViewManager;
    private _settings: Settings;
    private _liveTennis: LiveTennis;
    private _currentMatchIndex: number = 0;
    private _currentMatchesData: TennisMatch[] = [];
    private _log: (logs: string[]) => void;

    constructor(runner: Runner, manager: LiveViewManager, apiHandlers: ApiHandler | ApiHandlers,
        settings: Settings, log: (logs: string[]) => void,
        TFConstructor: new (apiHandler: ApiHandler, log: (logs: string[]) => void) => TF
    ) {
        this._runner = runner;
        this._manager = manager;
        this._settings = settings;
        this._log = log;
        const atpFetcher = new AtpFetcher('atp' in apiHandlers ? apiHandlers.atp : apiHandlers);
        const wtaFetcher = new WtaFetcher('wta' in apiHandlers ? apiHandlers.wta : apiHandlers);
        const ttFetcher = new TFConstructor('tt' in apiHandlers ? apiHandlers.tt : apiHandlers, log);
        this._liveTennis = new LiveTennis(log, settings, atpFetcher, wtaFetcher, ttFetcher);
    }

    disable() {
        this._liveTennis.disable();
        this._manager.unsetFetchTimer();
    }

    async fetchMatchData() {
        try {
            this._log(['Starting fetchMatchData']);
            const matchIds: Set<string> = new Set();
            const eventIds: Set<String> = new Set();
            const matchesData: TennisMatch[] = [];

            const generator = this._liveTennis.query();

            let result = await generator.next();

            while (!result.done) {
                const [r, e, m] = result.value;

                if (r === QueryResponseType.AddTournament) {
                    if (e.title) {
                        eventIds.add(e.id);
                        await this._runner.addEvent(e);
                    } else {
                        this._log(['Skipping event having null title', e.id]);
                    }
                } else if (r === QueryResponseType.UpdateTournament) {
                    eventIds.add(e.id);
                } else if (r === QueryResponseType.DeleteTournament) {
                    await this._runner.removeEvent(e);
                } else if (m) {
                    const matchId = this._runner.uniqMatchId(e, m);
                    if (r === QueryResponseType.AddMatch) {
                        (m as any).eventId = e.id;
                        (m as any).eventTitle = e.title;
                        await this._runner.addMatch(e, m);
                        matchIds.add(matchId);
                        matchesData.push(m);
                    } else if (r == QueryResponseType.UpdateMatch) {
                        await this._runner.updateMatch(e, m);
                        matchIds.add(matchId);
                        matchesData.push(m);
                    } else if (r === QueryResponseType.DeleteMatch) {
                        await this._runner.removeMatch(e, m);
                    }
                }

                result = await generator.next();
            }

            const allGood = result.value;
            if (allGood) {
                // Only remove stale entries if API call(s) were success
                await this._runner.filterAutoEvents(id => eventIds.has(id));
                await this._runner.filterLiveViewMatches(id => matchIds.has(id));
            }

            this._currentMatchesData = matchesData;
            await this._updateFloatingWindows(this._currentMatchesData);
            this._runner.setLastRefreshTime(Date.now());
            this._runner.setUpdateStatus(allGood);

            const interval = await this._settings!.getInt('update-interval');
            this._manager.setFetchTimer(interval, this.fetchMatchData.bind(this));
        } catch (e) {
            this._log(['Error during data fetch', String(e)]);
            if (e instanceof Error) {
                if (e.stack) {
                    this._log(['Stack trace', e.stack]);
                }
            }
        }
    }

    updateUI() {
        this._updateFloatingWindows(this._currentMatchesData);
    }

    private async _getSelectedMatches(matchesData: TennisMatch[]) {
        const selectedMatchIds = await this._settings.getStrv('selected-matches');
        const onlyLiveMatches = await this._settings.getBoolean('only-show-live-matches');
        const filteredMatchData = matchesData.filter(m => {
            const matchId = this._runner.uniqMatchId(m.event, m);
            /*
             * - A live match shown in live window previously is kept till it gets deselected.
             * - If only live matches are to be shown allow only selected live matches.
             * - Otherwise, show all selected matches.
             */
            return this._runner.isMatchWaitingDeselection(matchId) ||
                ((!onlyLiveMatches || m.isLive) && selectedMatchIds.includes(matchId));
        });
        this._log(['Live View Count', matchesData.length.toString(), selectedMatchIds.length.toString(), filteredMatchData.length.toString()]);
        return filteredMatchData;
    }

    private async _shouldHideLiveView(selectedMatches: TennisMatch[]): Promise<boolean> {
        return !await this._settings.getBoolean('enabled') ||
            (await this._settings.getBoolean('auto-hide-no-live-matches') && selectedMatches.every(m => !m.isLive));
    }

    private async _updateFloatingWindows(matchesData: TennisMatch[]) {
        const selectedMatches = await this._getSelectedMatches(matchesData);
        if (await this._shouldHideLiveView(selectedMatches)) {
            this._manager.hideLiveViews();
            return;
        }

        const numWindows = await this._settings!.getInt('num-windows');
        this._log(['Will create windows', numWindows.toString(), selectedMatches.length.toString()]);
        await this._manager.setLiveViewCount(numWindows);
        this._manager.destroyCycleTimeout();

        if (selectedMatches.length > numWindows) {
            await this._cycleMatches(selectedMatches);
        } else {
            selectedMatches.forEach((match, i) => this._manager.updateLiveViewContent(i, match));
            this._manager.setLiveViewContentsEmpty(selectedMatches.length);
        }
    }

    private async _cycleMatches(matchesData: TennisMatch[]) {
        const cycle = async () => {
            const selectedMatches = await this._getSelectedMatches(matchesData);
            if (await this._shouldHideLiveView(selectedMatches)) {
                this._manager.hideLiveViews();
                return this._manager.removeCycleTimeout();
            }

            if (selectedMatches.length <= this._manager.getLiveViewCount()) {
                this._updateFloatingWindows(matchesData);
                this._manager.destroyCycleTimeout();
                return this._manager.removeCycleTimeout();
            }

            for (let i = 0; i < this._manager.getLiveViewCount(); i++) {
                const matchToShow = selectedMatches[(this._currentMatchIndex + i) % selectedMatches.length];
                this._manager.updateLiveViewContent(i, matchToShow);
            }
            this._currentMatchIndex = (this._currentMatchIndex + 1) % selectedMatches.length;
            return this._manager.continueCycleTimeout();
        };

        await cycle();
        this._manager.destroyCycleTimeout();
        this._manager.setCycleTimeout(await this._settings!.getInt('match-display-duration'), cycle);
    }
};
