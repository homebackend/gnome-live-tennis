import { BrowserView, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { PreferenceRenderKeys } from './render_keys.js';


export class PrefsManager {
    private _prefsWindow: BrowserWindow;

    constructor(basePath: string) {
        const preloadPath = path.join(basePath, 'prefs_preload.js');

        this._prefsWindow = new BrowserWindow({
            width: 600,
            height: 600,
            show: true,
            frame: false,
            transparent: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        this._prefsWindow.loadFile(path.join(basePath, 'prefs_index.html'));

        /*
        this._prefsWindow.webContents.on('did-finish-load', () => {
            console.log('Renderer process loaded HTML');
            this._prefsWindow!.webContents.openDevTools();
        });
        */

        ipcMain.on(PreferenceRenderKeys.closePreferencesWindow, () => {
            this._prefsWindow.hide();
        });
    }
};
