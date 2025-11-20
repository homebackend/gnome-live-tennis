import { TennisEvent, TennisMatch } from "../common/types";
import { MenuRenderKeys } from "./render_keys";

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPIMenu', {

    openSettingsWindow: (): void => ipcRenderer.send(MenuRenderKeys.openSettingsWindow),
    log: (log: string[]): void => ipcRenderer.send(MenuRenderKeys.log, log),
    basePath: () => ipcRenderer.invoke(MenuRenderKeys.basePath),
    uniqMatchId: (event: TennisEvent, match: TennisMatch) => ipcRenderer.invoke(MenuRenderKeys.uniqMatchId, event, match),
    refresh: (): void => ipcRenderer.send(MenuRenderKeys.refresh),
    quit: (): void => ipcRenderer.send(MenuRenderKeys.quit),
    getSettingBoolean: (key: string) => ipcRenderer.invoke(MenuRenderKeys.getSettingBoolean, key),
    getSettingInt: (key: string) => ipcRenderer.invoke(MenuRenderKeys.getSettingInt, key),
    getSettingStrV: (key: string) => ipcRenderer.invoke(MenuRenderKeys.getSettingStrV, key),
    setSettingBoolean: (key: string, value: boolean): void => ipcRenderer.send(MenuRenderKeys.setSettingBoolean, key, value),
    setSettingInt: (key: string, value: number): void => ipcRenderer.send(MenuRenderKeys.setSettingInt, key, value),
    setSettingStrv: (key: string, value: string[]): void => ipcRenderer.send(MenuRenderKeys.setSettingStrv, key, value),
    setMatchSelected: (matchId: string): void => ipcRenderer.send(MenuRenderKeys.setMatchSelected, matchId),

    onMenuHidden: (callback: any) => ipcRenderer.on(MenuRenderKeys.menuHidden, (_, ...args) => callback(args)),
    onUpdateLastRefreshTime: (callback: any) => ipcRenderer.on(MenuRenderKeys.updateLastRefreshTime, (_, ...args) => callback(...args)),
    onAddEventMenuItem: (callback: any) => ipcRenderer.on(MenuRenderKeys.addEventMenuItem, (_, ...args) => callback(...args)),
    onAddMatchMenuItem: (callback: any) => ipcRenderer.on(MenuRenderKeys.addMatchMenuItem, (_, ...args) => callback(...args)),
    onUpdateMatchMenuItem: (callback: any) => ipcRenderer.on(MenuRenderKeys.updateMatchMenuItem, (_, ...args) => callback(...args)),
    onSetMatchSelection: (callback: any) => ipcRenderer.on(MenuRenderKeys.setMatchSelection, (_, ...args) => callback(...args)),
    onRemoveEventMenuItem: (callback: any) => ipcRenderer.on(MenuRenderKeys.removeEventMenuItem, (_, ...args) => callback(...args)),
    onRemoveMatchMenuItem: (callback: any) => ipcRenderer.on(MenuRenderKeys.removeMatchMenuItem, (_, ...args) => callback(...args)),
});
