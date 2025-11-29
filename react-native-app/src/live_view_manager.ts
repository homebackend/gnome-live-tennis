import { LiveViewManager } from "../../src/common/live_view_updater";
import { TennisMatch } from "../../src/common/types";

export class RNLiveViewManager implements LiveViewManager {
    private _fetcherId?: number;
    private _cycleIntervalId?: number;
    private _log: (logs: string[]) => void;
    private _setCurrentMatch: React.Dispatch<React.SetStateAction<TennisMatch | undefined>>

    constructor(log: (logs: string[]) => void,
        setCurrentMatch: React.Dispatch<React.SetStateAction<TennisMatch | undefined>>,
    ) {
        this._log = log;
        this._setCurrentMatch = setCurrentMatch;
    }

    setFetchTimer(interval: number, fetcher: () => void): void {
        if (this._fetcherId) {
            this.unsetFetchTimer();
        }

        this._fetcherId = setInterval(fetcher, 1000 * interval);
    }

    unsetFetchTimer(): void {
        if (this._fetcherId) {
            clearInterval(this._fetcherId);
            this._fetcherId = undefined;
        }
    }

    getLiveViewCount(): number {
        return 1;
    }

    async setLiveViewCount(numWindows: number): Promise<void> {
        if (numWindows > 1) {
            this._log(['Only single pip window is supported', numWindows.toString()]);
        }
    }

    updateLiveViewContent(window: number, match: TennisMatch): void {
        if (window === 0) {
            this._setCurrentMatch(match);
        }
    }

    setLiveViewContentsEmpty(window: number): void {
        if (window === 0) {
            this._setCurrentMatch(undefined);
        }
    }

    hideLiveViews(): void {
        // Not available
    }

    destroyLiveView(): void {
        // Not available
    }

    setCycleTimeout(interval: number, cycler: () => Promise<boolean>): void {
        if (!this._cycleIntervalId) {
            this._cycleIntervalId = setInterval(async () => {
                if (await cycler()) {
                    this.destroyCycleTimeout();
                }
            }, 1000 * interval);
        }
    }

    destroyCycleTimeout(): void {
        if (this._cycleIntervalId) {
            clearInterval(this._cycleIntervalId);
        }
    }

    removeCycleTimeout(): boolean {
        return true;
    }

    continueCycleTimeout(): boolean {
        return false;
    }
}
