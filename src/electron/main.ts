// src/main.ts
import { app, ipcMain } from 'electron';
import { ElectronRunner } from './runner.js';
import { ElectronSettings } from './settings.js';
import { MenuRenderKeys } from './render_keys.js';
import { ElectronLiveViewManager } from './live_view_manager.js';
import { ApiHandlers, LiveViewUpdater } from '../common/live_view_updater.js';
import { AxiosApiHandler, CurlApiHandler } from './api.js';
import { PrefsManager } from './prefs_manager.js';
import { Settings } from '../common/settings.js';
import AutoLaunch from 'auto-launch';

async function addAutostartIfApplicable(log: (logs: string[]) => void, settings: Settings) {
    try {
        const autostart = await settings.getBoolean('autostart');
        const appPath = app.getPath('exe');

        let autoLaunch = new AutoLaunch({
            name: 'live-tennis', // Name should match your app's name in package.json
            path: appPath,
        });

        const isEnabled = await autoLaunch.isEnabled();
        if (autostart && !isEnabled) {
            await autoLaunch.enable();
            log(['Enabled autostart for', appPath])
        }

        if (!autostart && isEnabled) {
            await autoLaunch.disable();
            log(['Diabled autostart'])
        }
    } catch (err) {
        log(['Error while configuring autostart']);
        if (err instanceof Error) {
            log(['Error', err.message]);
        }
    }
}

app.whenReady().then(() => {
    const settings = new ElectronSettings();
    settings.getBoolean('enable-debug-logging').then(debug => {
        const log = (logs: string[]) => {
            settings.getBoolean('enable-debug-logging').then(v => debug = v);

            if (debug) {
                console.log("[Live Tennis]", logs.join(", "));
            }
        }

        addAutostartIfApplicable(log, settings);

        const apiHandlers: ApiHandlers = {
            atp: new CurlApiHandler(log),
            wta: new AxiosApiHandler(log),
            tt: new CurlApiHandler(log),
        };
        const runner = new ElectronRunner(log, __dirname, settings);
        const manager = new ElectronLiveViewManager(__dirname, settings);
        const updater = new LiveViewUpdater(runner, manager, apiHandlers, settings, log);

        function handleSettingChange(key: string) {
            if (key === 'autostart') {
                return addAutostartIfApplicable(log, settings);
            }

            ['enabled', 'num-windows', 'selected-matches', 'auto-view-new-matches',
                'match-display-duration', 'enable-atp', 'enable-wta', 'enable-atp-challenger',
                'auto-hide-no-live-matches']
                .forEach(k => {
                    if (k == key) {
                        updater.updateUI();
                    }
                });

            ['live-window-size-x', 'live-window-size-y'].forEach(k => {
                if (k == key) {
                    manager.destroyLiveView();
                    updater.updateUI();
                }
            });
        }

        ipcMain.handle(MenuRenderKeys.getSettingBoolean, async (_, key: string) => await settings.getBoolean(key));
        ipcMain.on(MenuRenderKeys.setSettingBoolean, async (_, key: string, value: boolean) => {
            await settings.setBoolean(key, value);
            handleSettingChange(key);
        });
        ipcMain.handle(MenuRenderKeys.getSettingInt, async (_, key: string) => await settings.getInt(key));
        ipcMain.on(MenuRenderKeys.setSettingInt, async (_, key: string, value: number) => {
            await settings.setInt(key, value);
            handleSettingChange(key);
        });
        ipcMain.handle(MenuRenderKeys.getSettingStrV, async (_, key: string) => await settings.getStrv(key));
        ipcMain.on(MenuRenderKeys.setSettingStrv, async (_, key: string, value: string[]) => {
            await settings.setStrv(key, value);
            handleSettingChange(key);
        });

        ipcMain.on(MenuRenderKeys.log, (_, logs: string[]) => log(logs));
        ipcMain.handle(MenuRenderKeys.basePath, () => __dirname);
        ipcMain.on(MenuRenderKeys.quit, () => app.quit());
        ipcMain.on(MenuRenderKeys.openSettingsWindow, () => new PrefsManager(__dirname));

        ipcMain.on(MenuRenderKeys.refresh, () => {
            log(['Manual refresh triggered']);
            updater.fetchMatchData();
        });
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
