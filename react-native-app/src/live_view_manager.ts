import { LiveViewManager } from "../../src/common/live_view_updater";
import { TennisMatch } from "../../src/common/types";

export class RNLiveViewManager implements LiveViewManager {
    private _fetcherId?: number;
    private _cycleIntervalId?: number;
    private _log: (logs: string[]) => void;
    private _isInPipMode: boolean;
    private _setCurrentMatch: React.Dispatch<React.SetStateAction<TennisMatch | undefined>>
    private _setLiveViewAvailable: React.Dispatch<React.SetStateAction<boolean>>;

    constructor(log: (logs: string[]) => void, isInPipMode: boolean,
        setCurrentMatch: React.Dispatch<React.SetStateAction<TennisMatch | undefined>>,
        setLiveViewAvailable: React.Dispatch<React.SetStateAction<boolean>>,
    ) {
        this._log = log;
        this._isInPipMode = isInPipMode;
        this._setCurrentMatch = setCurrentMatch;
        this._setLiveViewAvailable = setLiveViewAvailable;
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
        if (this._isInPipMode) {
            return 1;
        } else {
            return 0;
        }
    }

    async setLiveViewCount(numWindows: number): Promise<void> {
        if (!this._isInPipMode) {
            if (numWindows > 1) {
                this._log(['Only single pip window is supported', numWindows.toString()]);
            }
            
            this._setLiveViewAvailable(true);
        }
    }

    updateLiveViewContent(window: number, match: TennisMatch): void {
        if (this._isInPipMode && window === 0) {
            this._setCurrentMatch(match);
        }
    }

    setLiveViewContentsEmpty(window: number): void {
        if (this._isInPipMode && window === 0) {
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
