import { LiveViewRendererCommon } from "../common/live_view_renderer.js";
import { TennisMatch } from "../common/types.js";
import { ElectronRenderer } from "./renderer.js";
import { StyleKeys } from "./style_keys.js";

declare global {
    interface Window {
        electronAPILiveView: {
            log(log: string[]): void;
            basePath(): Promise<string>;
            onUpdateLiveViewContent: (callback: (match: TennisMatch) => void) => void;
            onSetLiveViewContentsEmpty: (callback: () => void) => void;
        }
    }
}

class LiveViewRenderer extends LiveViewRendererCommon<HTMLDivElement, HTMLSpanElement, HTMLImageElement> {
    updateLiveViewContent(match: TennisMatch): void {
        this._clearContent();
        const root = document.getElementById('root');
        if (!root) {
            throw new Error('Root element not found');
        }

        const topBox = this.renderer.createContainer({
            xExpand: true,
            yExpand: true,
            className: StyleKeys.LiveViewFloatingScoreWindow,
        });
        root.appendChild(topBox);

        const mainDiv = this.renderer.createContainer({
            xExpand: true,
            yExpand: true,
            vertical: true,
            className: StyleKeys.LiveViewMainBox,
        });
        this.renderer.addContainersToContainer(topBox, mainDiv);
        
        this.createMainWindow(mainDiv, match);
    }

    setLiveViewContentsEmpty(): void {
        this._clearContent();
    }

    private _clearContent() {
        const root = document.getElementById('root');
        if (!root) {
            throw new Error('Root element not found');
        }

        root.innerHTML = '';
    }
}

async function renderLiveView() {
    console.log('insider renderLiveView');
    const basePath = await window.electronAPILiveView.basePath();
    const liveViewRenderer = new LiveViewRenderer(basePath, new ElectronRenderer(basePath, window.electronAPILiveView.log));

    window.electronAPILiveView.onUpdateLiveViewContent((match: TennisMatch) => liveViewRenderer.updateLiveViewContent(match));
    window.electronAPILiveView.onSetLiveViewContentsEmpty(() => liveViewRenderer.setLiveViewContentsEmpty());
}

document.addEventListener('DOMContentLoaded', renderLiveView);
