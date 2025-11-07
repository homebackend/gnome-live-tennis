import { LiveViewRendererKeys } from "./render_keys.js";

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPILiveView', {
    log: (log: string[]): void => ipcRenderer.send(LiveViewRendererKeys.log, log),
    basePath: (): Promise<string> => ipcRenderer.invoke(LiveViewRendererKeys.basePath),
    resizeToFitContents: (windowIndex: number, width: number, height: number): void => ipcRenderer.send(LiveViewRendererKeys.resizeToFitContents, windowIndex, width, height),

    onUpdateLiveViewContent: (callback: any) => ipcRenderer.on(LiveViewRendererKeys.updateLiveViewContent, (_, ...args) => callback(...args)),
    onSetLiveViewContentsEmpty: (callback: any) => ipcRenderer.on(LiveViewRendererKeys.setLiveViewContentsEmpty, (_, ...args) => callback(...args)),
    onSetWindowIndex: (callback: any) => ipcRenderer.on(LiveViewRendererKeys.setWindowIndex, (_, ...args) => callback(...args)),
});
