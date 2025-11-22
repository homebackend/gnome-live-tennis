import { LiveViewManager } from "../../src/common/live_view_updater";
import { Settings } from "../../src/common/settings";
import { TennisMatch } from "../../src/common/types";

export class RNLiveViewManager implements LiveViewManager {
    private _fetcherId?: number;
    private _settings: Settings;

    constructor(settings: Settings) {
        this._settings = settings;
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
        return 0;
    }

    setLiveViewCount(numWindows: number): Promise<void> {
        return;
    }

    updateLiveViewContent(window: number, match: TennisMatch): void {
        
    }

    setLiveViewContentsEmpty(window: number): void {
        
    }

    hideLiveViews(): void {
        
    }

    destroyLiveView(): void {
        
    }

    setCycleTimeout(interval: number, cycler: () => Promise<boolean>): void {
        
    }

    destroyCycleTimeout(): void {
        
    }

    removeCycleTimeout(): boolean {
        return true;
    }

    continueCycleTimeout(): boolean {
        return false;
    }
}
