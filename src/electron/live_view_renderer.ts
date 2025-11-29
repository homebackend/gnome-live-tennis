import { LiveViewRendererCommon } from "../common/live_view_renderer";
import { TennisMatch } from "../common/types";
import { ElectronRenderer } from "./renderer";
import { StyleKeys } from "../common/style_keys";

declare global {
    interface Window {
        electronAPILiveView: {
            log(log: string[]): void;
            basePath(): Promise<string>;
            resizeToFitContents: (windowIndex: number, width: number, height: number) => void;
            onUpdateLiveViewContent: (callback: (match: TennisMatch) => void) => void;
            onSetLiveViewContentsEmpty: (callback: () => void) => void;
            onSetWindowIndex: (callback: (windowIndex: number) => void) => void;
        }
    }
}

var windowIndex: number | undefined;

class LiveViewRenderer extends LiveViewRendererCommon<HTMLDivElement, HTMLSpanElement, HTMLImageElement> {
    async updateLiveViewContent(match: TennisMatch): Promise<void> {
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

        // Give some time for content to adjust
        setTimeout(resizeWindowToFitContent, 50);
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

function resizeWindowToFitContent() {
    if (windowIndex !== undefined) {
        const content = document.getElementById('root');
        if (content) {
            const width = content.scrollWidth;
            const height = content.scrollHeight;

            window.electronAPILiveView.resizeToFitContents(windowIndex, width, height);
        }
    }
}

async function renderLiveView() {
    const basePath = await window.electronAPILiveView.basePath();
    const renderer = new ElectronRenderer(basePath, window.electronAPILiveView.log);
    const liveViewRenderer = new LiveViewRenderer(basePath, window.electronAPILiveView.log, renderer);

    window.electronAPILiveView.onUpdateLiveViewContent((match: TennisMatch) => liveViewRenderer.updateLiveViewContent(match));
    window.electronAPILiveView.onSetLiveViewContentsEmpty(() => liveViewRenderer.setLiveViewContentsEmpty());
    window.electronAPILiveView.onSetWindowIndex(i => {
        windowIndex = i;
        console.log('Index set to: ', windowIndex);
    });
}

document.addEventListener('DOMContentLoaded', renderLiveView);
