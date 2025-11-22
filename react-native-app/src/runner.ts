import { RNCheckedMenuItem, RNLinkMenuItem, RNMatchMenuItem, RNPopupSubMenuItem } from "./menuitem";
import { ReactElementGenerator, RNElement, RNRenderer } from "./renderer";
import { AppMenuRenderer } from '../../src/common/app/menu_renderer';
import { Settings } from "../../src/common/settings";
import { ReactElement } from "react";
import React from "react";
import { BackHandler } from "react-native";

export class RNRunner extends AppMenuRenderer<RNElement, RNElement, RNElement, ReactElementGenerator,
    RNPopupSubMenuItem, RNLinkMenuItem, RNCheckedMenuItem, RNMatchMenuItem> {

    private _refreshTimeText = 'Never';
    private _setRefreshTimeText: React.Dispatch<React.SetStateAction<string>>;
    private _menuItems: RNPopupSubMenuItem[] = [];
    private _mainContainer: RNElement;
    public setExpandEvent: React.Dispatch<React.SetStateAction<RNPopupSubMenuItem | null>>;

    constructor(log: (logs: string[]) => void, settings: Settings,
        setRefreshTimeText: React.Dispatch<React.SetStateAction<string>>,
        setExpandEvent: React.Dispatch<React.SetStateAction<RNPopupSubMenuItem | null>>,
    ) {
        super('./', log, settings, new RNRenderer('', log), RNPopupSubMenuItem, RNLinkMenuItem, RNCheckedMenuItem, RNMatchMenuItem);

        if (!this.otherContainer.children) {
            this.otherContainer.children = [];
        }

        this._setRefreshTimeText = setRefreshTimeText;
        this.setExpandEvent = setExpandEvent;
        const r = this._renderer;
        this._mainContainer = r.createContainer({ vertical: true });
        r.addContainersToContainer(this._mainContainer, [this.eventContainer, this.otherContainer]);
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
        return this._mainContainer.element();
    }

    protected refresh(): void {
        throw new Error("Method not implemented.");
    }

    protected openSettingsWindow(): void {
        throw new Error("Method not implemented.");
    }

    protected quit(): void {
        BackHandler.exitApp();
    }
}