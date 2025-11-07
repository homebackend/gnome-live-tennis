import { BrowserWindow, screen } from "electron";
import { LiveViewManager } from "../common/live_view_updater.js";
import { TennisMatch } from "../common/types.js";
import { LiveViewRendererKeys } from "../common/render_keys.js";
import * as path from 'path';
import { Settings } from "../common/settings.js";

const PADDING = 20;

export class ElectronLiveViewManager implements LiveViewManager {
    private _basePath: string;
    private _settings: Settings;
    private _activeFloatingWindows: BrowserWindow[] = [];
    private _fetchIntervalId: NodeJS.Timeout | undefined;
    private _cycleIntervalId: NodeJS.Timeout | undefined;

    constructor(basePath: string, settings: Settings) {
        this._basePath = basePath;
        this._settings = settings;
    }

    private async _createLiveViewWindow(): Promise<BrowserWindow> {
        const preloadPath = path.join(this._basePath, 'live_view_preload.js');
        const windowWidth = await this._settings.getInt('live-window-size-x');
        const windowHeight = await this._settings.getInt('live-window-size-y');

        const window = new BrowserWindow({
            width: windowWidth,
            height: windowHeight,
            show: false,
            frame: false,
            transparent: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        const indexFile = path.join(this._basePath, 'live_view_index.html')
        window.loadFile(indexFile);

        ///*
        window.webContents.on('did-finish-load', () => {
            console.log('Renderer process loaded HTML');
            window.webContents.openDevTools();
        });
        //*/

        window.on('ready-to-show', () => {
            window.setAlwaysOnTop(true, 'screen-saver');
            window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
            window.setFullScreenable(false);
            window.showInactive();
        });

        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const x = screenWidth - windowWidth - PADDING;
        const y = screenHeight - PADDING - ((this._activeFloatingWindows.length + 1) * (windowHeight + PADDING));
        //console.log('window', this._basePath, preloadPath, indexFile, screenWidth, screenHeight, windowWidth, windowHeight, x, y);
        // window 1920 1048 450 400 1460 -20

        window.setPosition(x, y);

        return window;
    }

    setFetchTimer(interval: number, fetcher: () => void): void {
        if (!this._fetchIntervalId) {
            this._fetchIntervalId = setInterval(fetcher, 1000 * interval);
        }
    }

    getLiveViewCount(): number {
        return this._activeFloatingWindows.length;
    }

    private async _addLiveViewWindows(numWindows: number): Promise<void> {
        while (this._activeFloatingWindows.length < numWindows) {
            this._activeFloatingWindows.push(await this._createLiveViewWindow());
        }

        // Add some sleep to allow render processes to initialize
        await this.sleep(1000);
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async setLiveViewCount(numWindows: number): Promise<void> {
        if (this._activeFloatingWindows.length < numWindows) {
            await this._addLiveViewWindows(numWindows);
        } else {
            while (this._activeFloatingWindows.length > numWindows) {
                this._activeFloatingWindows.pop()?.destroy();
            }
        }
    }

    updateLiveViewContent(window: number, match: TennisMatch): void {
        this._activeFloatingWindows[window].showInactive();
        this._activeFloatingWindows[window].webContents.send(LiveViewRendererKeys.updateLiveViewContent, match);
    }

    setLiveViewContentsEmpty(window: number): void {
        for (let i = window; i < this._activeFloatingWindows.length; i++) {
            this._activeFloatingWindows[i].hide();
            this._activeFloatingWindows[i].webContents.send(LiveViewRendererKeys.setLiveViewContentsEmpty);
        }
    }

    hideLiveViews(): void {
        this._activeFloatingWindows.forEach(w => w.hide());
    }

    destroyLiveView(): void {
        this._activeFloatingWindows.forEach(w => w.destroy());
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
};
