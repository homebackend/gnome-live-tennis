import { RNCheckedMenuItem, RNLinkMenuItem, RNMatchMenuItem, RNPopupSubMenuItem } from "./menuitem";
import { ReactElementGenerator, RNElement, RNRenderer } from "./renderer";
import { AppMenuRenderer } from '../../src/common/app/menu_renderer';
import { Settings } from "../../src/common/settings";
import { ReactElement } from "react";
import React from "react";
import { BackHandler, ScrollView, View } from "react-native";
import { getCssThemeStyles, LiveTennisTheme } from "./style";
import { StyleKeys } from "../../src/common/style_keys";

export class RNRunner extends AppMenuRenderer<RNElement, RNElement, RNElement, ReactElementGenerator,
    RNPopupSubMenuItem, RNLinkMenuItem, RNCheckedMenuItem, RNMatchMenuItem> {

    private _refreshTimeText = 'Never';
    private _setRefreshTimeText: React.Dispatch<React.SetStateAction<string>>;
    private _menuItems: RNPopupSubMenuItem[] = [];
    public setExpandEvent: React.Dispatch<React.SetStateAction<RNPopupSubMenuItem | null>>;
    private _openSettings: () => void;
    private _fetchData: () => void;
    private _theme: LiveTennisTheme;

    constructor(log: (logs: string[]) => void, settings: Settings, theme: LiveTennisTheme,
        setRefreshTimeText: React.Dispatch<React.SetStateAction<string>>,
        setExpandEvent: React.Dispatch<React.SetStateAction<RNPopupSubMenuItem | null>>,
        openSettings: () => void, fetchData: () => void,
    ) {
        super('./', log, settings, new RNRenderer('', log, theme), RNPopupSubMenuItem, RNLinkMenuItem, RNCheckedMenuItem, RNMatchMenuItem);

        if (!this.otherContainer.children) {
            this.otherContainer.children = [];
        }

        this._setRefreshTimeText = setRefreshTimeText;
        this.setExpandEvent = setExpandEvent;
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