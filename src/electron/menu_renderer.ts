// src/renderer.ts
import { Settings } from '../common/settings';
import { TennisEvent, TennisMatch } from '../common/types';
import { ElectronCheckedMenuItem, ElectronLinkMenuItem, ElectronMatchMenuItem, ElectronPopupSubMenuItem } from './menuitem';
import { ElectronRenderer } from './renderer';
import { AppMenuRenderer } from '../common/app/menu_renderer';

declare global {
    interface Window {
        electronAPIMenu: {
            openSettingsWindow(): void;
            log(log: string[]): void;
            basePath(): Promise<string>;
            uniqMatchId(event: TennisEvent, match: TennisMatch): Promise<string>;
            refresh(): void;
            quit(): void;
            getSettingBoolean: (key: string) => Promise<boolean>;
            getSettingInt: (key: string) => Promise<number>;
            getSettingStrV: (key: string) => Promise<string[]>;
            setSettingBoolean: (key: string, value: boolean) => void;
            setSettingInt: (key: string, value: number) => void;
            setSettingStrv: (key: string, value: string[]) => void;
            resizeToFitContents: (width: number, height: number) => void;

            setMatchSelected: (matchId: string) => void;

            onMenuHidden: (callback: () => void) => void;
            onUpdateLastRefreshTime: (callback: (time: string) => void) => void;
            onAddEventMenuItem: (callback: (event: TennisEvent, text: string, position: number, url: string | undefined, isAuto: boolean) => void) => void;
            onAddMatchMenuItem: (callback: (event: TennisEvent, match: TennisMatch, isSelected: boolean) => void) => void;
            onUpdateMatchMenuItem: (callback: (matchId: string, match: TennisMatch) => void) => void;
            onSetMatchSelection: (callback: (matchId: string, selection: boolean) => void) => void;
            onRemoveEventMenuItem: (callback: (event: TennisEvent) => void) => void;
            onRemoveMatchMenuItem: (callback: (matchId: string) => void) => void;
        };
    }
}

class MainWindowSettings implements Settings {
    async getBoolean(key: string): Promise<boolean> {
        return window.electronAPIMenu.getSettingBoolean(key);
    }

    async getStrv(key: string): Promise<string[]> {
        return window.electronAPIMenu.getSettingStrV(key);
    }

    async getInt(key: string): Promise<number> {
        return window.electronAPIMenu.getSettingInt(key);
    }

    async setBoolean(key: string, value: boolean): Promise<void> {
        window.electronAPIMenu.setSettingBoolean(key, value);
    }

    async setInt(key: string, value: number): Promise<void> {
        window.electronAPIMenu.setSettingInt(key, value);
    }

    async setStrv(key: string, value: string[]): Promise<void> {
        window.electronAPIMenu.setSettingStrv(key, value);
    }
}

class MenuRenderer extends AppMenuRenderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement, HTMLDivElement,
    ElectronPopupSubMenuItem, ElectronLinkMenuItem, ElectronCheckedMenuItem, ElectronMatchMenuItem> {
    private _refreshTimeSpan?: HTMLSpanElement;

    constructor(basePath: string, renderer: ElectronRenderer) {
        super(basePath, window.electronAPIMenu.log, new MainWindowSettings(), renderer,
            ElectronPopupSubMenuItem, ElectronLinkMenuItem, ElectronCheckedMenuItem, ElectronMatchMenuItem);

        const root = document.getElementById('root');
        if (!root) {
            throw new Error('Root element not found');
        }

        root.appendChild(this.eventContainer);
        root.appendChild(this.otherContainer);

        this.setupBaseMenu();
    }

    addEventMenuItemToMenu(item: ElectronPopupSubMenuItem, position: number): void {
        if (this.eventContainer.children.length > position) {
            const referenceNode = this.eventContainer.children[position];
            this.eventContainer.insertBefore(item.menu, referenceNode);
        } else {
            this.eventContainer.appendChild(item.menu);
        }

        setTimeout(resizeWindowToFitContent, 50);
    }

    setLastRefrestTimeText(text: string): void {
        if (this._refreshTimeSpan) {
            this._refreshTimeSpan.textContent = text;
        }
    }

    addItemToMenu(item: ElectronCheckedMenuItem): void {
        const r = this._renderer;
        r.addContainersToContainer(this.otherContainer, item.item);

        setTimeout(resizeWindowToFitContent, 50);
    }

    addRefreshMenuItem(): void {
        const [refreshDiv, refreshTimeSpan] = this.getRefreshMenuItem('Never');
        this._refreshTimeSpan = refreshTimeSpan;
        const r = this._renderer;
        r.addContainersToContainer(this.otherContainer, refreshDiv);
    }

    protected refresh(): void {
        window.electronAPIMenu.refresh();
    }

    protected openSettingsWindow(): void {
        window.electronAPIMenu.openSettingsWindow();
    }

    protected quit(): void {
        window.electronAPIMenu.quit();
    }
};

function resizeWindowToFitContent() {
    const content = document.getElementById('root');
    if (content) {
        const width = content.scrollWidth;
        const height = content.scrollHeight;

        window.electronAPIMenu.resizeToFitContents(width, height);
    }
}

async function renderMenu() {
    const basePath = await window.electronAPIMenu.basePath();
    const menuRenderer = new MenuRenderer(basePath, new ElectronRenderer(basePath, window.electronAPIMenu.log));

    window.electronAPIMenu.onMenuHidden(() => menuRenderer.handleMenuHidden());
    window.electronAPIMenu.onUpdateLastRefreshTime((time: string) => menuRenderer.setLastRefrestTimeText(time));
    window.electronAPIMenu.onAddEventMenuItem((event: TennisEvent, text: string, position: number, url: string | undefined, isAuto: boolean) => menuRenderer.addEventMenuItem(event, text, position, url, isAuto));
    window.electronAPIMenu.onAddMatchMenuItem((event: TennisEvent, match: TennisMatch, isSelected: boolean) => menuRenderer.addMatchMenuItem(event, match, isSelected));
    window.electronAPIMenu.onUpdateMatchMenuItem((matchId: string, match: TennisMatch) => menuRenderer.updateMatchMenuItem(matchId, match));
    window.electronAPIMenu.onSetMatchSelection((matchId: string, selection: boolean) => menuRenderer.setMatchSelection(matchId, selection));
    window.electronAPIMenu.onRemoveEventMenuItem((event: TennisEvent) => menuRenderer.removeEventMenuItem(event));
    window.electronAPIMenu.onRemoveMatchMenuItem((matchId: string) => menuRenderer.removeMatchMenuItem(matchId));

    window.electronAPIMenu.refresh();
}

document.addEventListener('DOMContentLoaded', renderMenu);
