import { BrowserWindow, ipcMain, Point, Rectangle, screen, Tray } from "electron";
import { Runner } from "../common/runner.js";
import { Settings } from "../common/settings.js";
import { TennisEvent, TennisMatch } from "../common/types.js";
import * as path from 'path';
import { MenuRenderKeys } from "./render_keys.js";

export class ElectronRunner extends Runner {
    private _eventIds = new Set<string>();
    private _matchIds = new Set<string>();
    private _selectedMatchIds = new Set<string>();
    private _customMenu: BrowserWindow;
    private _tray: Tray;

    constructor(log: (logs: string[]) => void, basePath: string, settings: Settings) {
        super(log, settings, basePath);

        const preloadPath = path.join(basePath, 'menu_preload.js');

        this._customMenu = new BrowserWindow({
            width: 600,
            height: 600,
            show: false,
            frame: false,
            transparent: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false,
            },
        });
        this._tray = new Tray(this.getIconPath());

        this._setup();
    }

    private _setup(): void {
        this._setupCustomMenu();
        this._setupTray();
        this._setupIpc();
    }

    private _setupCustomMenu(): void {
        this._customMenu.loadFile(path.join(this.basePath, 'menu_index.html'));

        this._customMenu.on('blur', () => {
            this._customMenu.hide();
        });

        /*
        this._customMenu.webContents.on('did-finish-load', () => {
            console.log('Renderer process loaded HTML');
            this._customMenu!.webContents.openDevTools();
        });
         */
    }

    private _setupTray(): void {
        this._tray.setToolTip('Live Tennis');
        this._tray.on('click', (event, bounds, position) => {
            this._customMenu.isVisible() ? this._customMenu.hide() : this._showMenu(bounds, position);
        });
    }

    private _setupIpc(): void {
        ipcMain.handle(MenuRenderKeys.uniqMatchId, (_, event: TennisEvent, match: TennisMatch) => this.uniqMatchId(event, match));
        ipcMain.on(MenuRenderKeys.setMatchSelected, (_, matchId: string) => this._selectedMatchIds.add(matchId));
    }

    private _showMenu(bounds: Rectangle, position: Point) {

        let x, y;
        const windowBounds = this._customMenu.getBounds();
        const displayBounds = screen.getPrimaryDisplay().bounds;
        
        let iconBounds = bounds; 

        // Workaround for Linux (where bounds might be 0,0,0,0)
        if (iconBounds.width === 0 && process.platform === 'linux') {
             const cursor = screen.getCursorScreenPoint();
             iconBounds = { x: cursor.x, y: cursor.y, width: 0, height: 0 };
        }
        
        // Positioning calculation (adjusts for Top/Bottom taskbars)
        if (process.platform === 'darwin') { // macOS (top menu bar)
            x = Math.round(iconBounds.x + (iconBounds.width / 2) - (windowBounds.width / 2));
            y = iconBounds.y + iconBounds.height;
        } else { // Windows / Linux (usually bottom taskbar)
            x = Math.round(iconBounds.x + (iconBounds.width / 2) - (windowBounds.width / 2));
            y = iconBounds.y - windowBounds.height; // Position above the icon
        }

        // Handle edge cases where window might go off-screen
        if (x + windowBounds.width > displayBounds.width) {
             x = displayBounds.width - windowBounds.width;
        }
        if (x < displayBounds.x) {
            x = displayBounds.x;
        }

        this._customMenu.setPosition(x, y);
        this._customMenu.show();
        this._customMenu.focus();
    }

    updateLastRefreshTime(): void {
        if (this._customMenu) {
            this._customMenu.webContents.send(MenuRenderKeys.updateLastRefreshTime, this.lastRefreshTimeDisplay());
        }
    }

    hasEvent(eventId: string): boolean {
        return this._eventIds.has(eventId);
    }

    addEventMenuItem(event: TennisEvent, text: string, position: number, url: string | undefined, isAuto: boolean): void {
        this._eventIds.add(event.id);
        this._customMenu.webContents.send(MenuRenderKeys.addEventMenuItem, event, text, position, url, isAuto);
    }

    hasMatch(matchId: string): boolean {
        return this._matchIds.has(matchId);
    }

    addMatchMenuItem(event: TennisEvent, match: TennisMatch, isSelected: boolean): void {
        this._matchIds.add(this.uniqMatchId(event, match));
        this._customMenu.webContents.send(MenuRenderKeys.addMatchMenuItem, event, match, isSelected);
    }

    updateMatchMenuItem(matchId: string, match: TennisMatch): void {
        this._customMenu.webContents.send(MenuRenderKeys.updateMatchMenuItem, matchId, match);
    }

    isMatchSelected(matchId: string): boolean {
        return this._selectedMatchIds.has(matchId);
    }

    setMatchSelection(matchId: string, selection: boolean): void {
        this._customMenu.webContents.send(MenuRenderKeys.setMatchSelection, matchId, selection);
    }

    removeEventMenuItem(event: TennisEvent): void {
        this._customMenu.webContents.send(MenuRenderKeys.removeEventMenuItem, event);
    }

    removeMatchMenuItem(matchId: string): void {
        this._customMenu.webContents.send(MenuRenderKeys.removeMatchMenuItem, matchId);
    }

    destroy(): void {
    }
}
