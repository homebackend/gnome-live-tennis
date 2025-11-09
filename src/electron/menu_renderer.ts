// src/renderer.ts
import { MenuRendererCommon } from '../common/menu_renderer.js';
import { Alignment } from '../common/renderer.js';
import { Settings } from '../common/settings.js';
import { TennisEvent, TennisMatch } from '../common/types.js';
import { ElectronCheckedMenuItem, ElectronLinkMenuItem, ElectronMatchMenuItem, ElectronPopupSubMenuItem } from './menuitem.js';
import { ElectronRenderer } from './renderer.js';
import { StyleKeys } from '../common/style_keys.js';

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

            setMatchSelected: (matchId: string) => void;

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

class MenuRenderer extends MenuRendererCommon<HTMLDivElement, HTMLSpanElement, HTMLImageElement, HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLDivElement,
    ElectronPopupSubMenuItem, ElectronLinkMenuItem, ElectronCheckedMenuItem, ElectronMatchMenuItem> {
    private _eventDiv: HTMLDivElement;
    private _othersDiv: HTMLDivElement;
    private _refreshTimeSpan?: HTMLSpanElement;

    constructor(basePath: string, renderer: ElectronRenderer) {
        super(window.electronAPIMenu.log, new MainWindowSettings(), basePath,
            renderer, ElectronPopupSubMenuItem, ElectronLinkMenuItem, ElectronCheckedMenuItem, ElectronMatchMenuItem);

        const root = document.getElementById('root');
        if (!root) {
            throw new Error('Root element not found');
        }

        this._eventDiv = renderer.createContainer({ vertical: true, xExpand: true });
        root.appendChild(this._eventDiv);
        this._othersDiv = renderer.createContainer({ vertical: true, xExpand: true });
        root.appendChild(this._othersDiv);

        this.setupBaseMenu();
    }

    addEventMenuItemToMenu(item: ElectronPopupSubMenuItem, position: number): void {
        if (this._eventDiv.children.length > position) {
            const referenceNode = this._eventDiv.children[position];
            this._eventDiv.insertBefore(item.menu, referenceNode);
        } else {
            this._eventDiv.appendChild(item.menu);
        }
    }

    setLastRefrestTimeText(text: string): void {
        if (this._refreshTimeSpan) {
            this._refreshTimeSpan.textContent = text;
        }
    }

    addMenuSeprator(): void {
        const r = this._renderer;
        r.addContainersToContainer(this._othersDiv, r.createSeparator({}));
    }

    addItemToMenu(item: ElectronCheckedMenuItem): void {
        const r = this._renderer;
        r.addContainersToContainer(this._othersDiv, item.item);
    }

    addRefreshMenuItem(): void {
        const r = this._renderer;
        const refreshDiv = r.createContainer({ xExpand: true, className: StyleKeys.MainMenuMatchItem });
        r.addTextToContainer(refreshDiv, {
            text: 'Last Refresh',
            onClick: window.electronAPIMenu.refresh,
            className: StyleKeys.NoWrapText,
        });
        this._refreshTimeSpan = r.addTextToContainer(refreshDiv, {
            text: 'Never',
            className: `${StyleKeys.NoWrapText} ${StyleKeys.MainMenuRefreshLabel}`,
            xExpand: true,
            textAlign: Alignment.End,
            onClick: window.electronAPIMenu.refresh,
        });

        r.addContainersToContainer(this._othersDiv, refreshDiv);
    }

    addSettingsItem(): void {
        const r = this._renderer;
        r.addTextToContainer(this._othersDiv, {
            text: 'Settings',
            xExpand: true,
            className: StyleKeys.MainMenuMatchItem,
            onClick: () => window.electronAPIMenu.openSettingsWindow(),
        });
    }

    setupAdditionalMenuItems(): void {
        this.addMenuSeprator();
        const r = this._renderer;
        r.addTextToContainer(this._othersDiv, {
            text: 'Quit Application',
            xExpand: true,
            onClick: window.electronAPIMenu.quit,
            className: `${StyleKeys.NoWrapText} ${StyleKeys.MainMenuMatchItem}`,
        });
    }

};

async function renderMenu() {
    const basePath = await window.electronAPIMenu.basePath();
    const menuRenderer = new MenuRenderer(basePath, new ElectronRenderer(basePath, window.electronAPIMenu.log));

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
