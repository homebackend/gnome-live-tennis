import { LiveViewRendererKeys } from "./render_keys.js";

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPILiveView', {
    log: (log: string[]): void => ipcRenderer.send(LiveViewRendererKeys.log, log),
    basePath: (): Promise<string> => ipcRenderer.invoke(LiveViewRendererKeys.basePath),

    onUpdateLiveViewContent: (callback: any) => ipcRenderer.on(LiveViewRendererKeys.updateLiveViewContent, (_, ...args) => callback(...args)),
    onSetLiveViewContentsEmpty: (callback: any) => ipcRenderer.on(LiveViewRendererKeys.setLiveViewContentsEmpty, (_, ...args) => callback(...args)),
});
