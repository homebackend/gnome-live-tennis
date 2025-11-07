import { contextBridge, ipcRenderer } from 'electron';
import { MenuRenderKeys, PreferenceRenderKeys } from './render_keys.js';

contextBridge.exposeInMainWorld('preferences', {
    closeWindow: () => ipcRenderer.send(PreferenceRenderKeys.closePreferencesWindow),
    getSettingBoolean: (key: string) => ipcRenderer.invoke(MenuRenderKeys.getSettingBoolean, key),
    getSettingInt: (key: string) => ipcRenderer.invoke(MenuRenderKeys.getSettingInt, key),
    getSettingStrV: (key: string) => ipcRenderer.invoke(MenuRenderKeys.getSettingStrV, key),
    setSettingBoolean: (key: string, value: boolean): void => ipcRenderer.send(MenuRenderKeys.setSettingBoolean, key, value),
    setSettingInt: (key: string, value: number): void => ipcRenderer.send(MenuRenderKeys.setSettingInt, key, value),
    setSettingStrv: (key: string, value: string[]): void => ipcRenderer.send(MenuRenderKeys.setSettingStrv, key, value),
});
