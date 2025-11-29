import React from "react";
import { ReactElement } from "react";
import { BackHandler, NativeModules, Platform, ScrollView, View } from "react-native";

import { RNCheckedMenuItem, RNLinkMenuItem, RNMatchMenuItem, RNPopupSubMenuItem } from "./menuitem";
import { ReactElementGenerator, RNElement, RNRenderer } from "./renderer";
import { AppMenuRenderer } from '../../src/common/app/menu_renderer';
import { Settings } from "../../src/common/settings";
import { getCssThemeStyles, LiveTennisTheme } from "./style";
import { StyleKeys } from "../../src/common/style_keys";
import { TennisEvent, TennisMatch } from "../../src/common/types";

export class RNRunner extends AppMenuRenderer<RNElement, RNElement, RNElement, ReactElementGenerator,
    RNPopupSubMenuItem, RNLinkMenuItem, RNCheckedMenuItem, RNMatchMenuItem> {

    private _refreshTimeText = 'Never';
    private _setRefreshTimeText: React.Dispatch<React.SetStateAction<string>>;
    private _menuItems: RNPopupSubMenuItem[] = [];
    public setExpandEvent: React.Dispatch<React.SetStateAction<RNPopupSubMenuItem | null>>;
    private _addToImageFetchQueue: (uri?: string) => void;
    private _openSettings: () => void;
    private _fetchData: () => void;
    private _theme: LiveTennisTheme;
    private _userAlerted = false;

    constructor(log: (logs: string[]) => void, settings: Settings,
        theme: LiveTennisTheme, renderer: RNRenderer,
        setRefreshTimeText: React.Dispatch<React.SetStateAction<string>>,
        setExpandEvent: React.Dispatch<React.SetStateAction<RNPopupSubMenuItem | null>>,
        addToImageFetchQueue: (uri?: string) => void,
        openSettings: () => void, fetchData: () => void,
    ) {
        super('./', log, settings, renderer,
            RNPopupSubMenuItem, RNLinkMenuItem, RNCheckedMenuItem, RNMatchMenuItem);

        if (!this.otherContainer.children) {
            this.otherContainer.children = [];
        }

        this._setRefreshTimeText = setRefreshTimeText;
        this.setExpandEvent = setExpandEvent;
        this._addToImageFetchQueue = addToImageFetchQueue;
        this._openSettings = openSettings;
        this._fetchData = fetchData;
        this._theme = theme;
    }

    addEventMenuItemToMenu(item: RNPopupSubMenuItem, position: number): void {
        this._menuItems.splice(position, 0, item);
        item.parent = this;
    }

    setLastRefrestTimeText(text: string): void {
        this._setRefreshTimeText(text);
    }

    addRefreshMenuItem(): void {
        const RefreshItem = () => {
            const [container] = this.getRefreshMenuItem(this._refreshTimeText);
            return container.element();
        };

        this.otherContainer.children?.push(RefreshItem);
    }

    addItemToMenu(item: RNCheckedMenuItem): void {
        this.otherContainer.children!.push(item.item);
    }

    async addEvent(event: TennisEvent): Promise<void> {
        this._addToImageFetchQueue(event.eventTypeUrl);
        return super.addEvent(event);
    }

    async addMatch(event: TennisEvent, match: TennisMatch): Promise<void> {
        match.team1.players.forEach(p => this._addToImageFetchQueue(p.headUrl));
        match.team2.players.forEach(p => this._addToImageFetchQueue(p.headUrl));
        return super.addMatch(event, match);
    }

    renderMainUI(refreshTimeText: string, expandedEvent: RNPopupSubMenuItem | null): ReactElement {
        this._refreshTimeText = refreshTimeText;
        this._menuItems.forEach(mi => (mi.expanded = (mi === expandedEvent)));
        this.eventContainer.children = this._menuItems.map(mi => mi.menu);
        const themeData = getCssThemeStyles(this._theme)[StyleKeys.MainMenuTournamentItem];
        return React.createElement(ScrollView, { style: { flexDirection: 'column' } },
            React.createElement(View, { style: [themeData, { width: '100%' }] },
                this.eventContainer.element(),
                this.otherContainer.element(),
            ),
        );
    }

    setupAdditionalMenuItems(): void {
        super.setupAdditionalMenuItems();
        if (__DEV__ && Platform.OS === 'android') {
            this.addMenuSeprator();
            const r = this._renderer;
            r.addTextToContainer(this.otherContainer, {
                text: 'Open Dev Menu',
                xExpand: true,
                className: `${StyleKeys.NoWrapText} ${StyleKeys.MainMenuMatchItem}`,
                onClick: () => NativeModules.DevMenu.show(),
            })
        }
    }

    protected refresh(): void {
        this._fetchData();
    }

    protected openSettingsWindow(): void {
        this._openSettings();
    }

    protected quit(): void {
        BackHandler.exitApp();
    }
}