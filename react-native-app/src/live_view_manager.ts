import { LiveViewManager } from "../../src/common/live_view_updater";
import { TennisMatch } from "../../src/common/types";

export class RNLiveViewManager implements LiveViewManager {
    setFetchTimer(interval: number, fetcher: () => void): void {
        throw new Error("Method not implemented.");
    }
    getLiveViewCount(): number {
        throw new Error("Method not implemented.");
    }
    setLiveViewCount(numWindows: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateLiveViewContent(window: number, match: TennisMatch): void {
        throw new Error("Method not implemented.");
    }
    setLiveViewContentsEmpty(window: number): void {
        throw new Error("Method not implemented.");
    }
    hideLiveViews(): void {
        throw new Error("Method not implemented.");
    }
    destroyLiveView(): void {
        throw new Error("Method not implemented.");
    }
    setCycleTimeout(interval: number, cycler: () => Promise<boolean>): void {
        throw new Error("Method not implemented.");
    }
    destroyCycleTimeout(): void {
        throw new Error("Method not implemented.");
    }
    removeCycleTimeout(): boolean {
        throw new Error("Method not implemented.");
    }
    continueCycleTimeout(): boolean {
        throw new Error("Method not implemented.");
    }
}
