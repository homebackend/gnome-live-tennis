import { RNCheckedMenuItem, RNLinkMenuItem, RNMatchMenuItem, RNPopupSubMenuItem } from "./menuitem";
import { ReactElementGenerator, RNElement, RNRenderer } from "./renderer";
import { AppMenuRenderer } from '../../src/common/app/menu_renderer';
import { Settings } from "../../src/common/settings";
import { useState } from "react";

export class RNRunner extends AppMenuRenderer<RNElement, RNElement, RNElement, ReactElementGenerator,
    RNPopupSubMenuItem, RNLinkMenuItem, RNCheckedMenuItem, RNMatchMenuItem> {

    private _setEvents?: React.Dispatch<React.SetStateAction<RNPopupSubMenuItem[]>>;
    private _setRefreshTimeText?: React.Dispatch<React.SetStateAction<string>>;
    private _menuItems: RNPopupSubMenuItem[] = [];
    private _mainContainer: RNElement;

    constructor(log: (logs: string[]) => void, settings: Settings) {
        super('', log, settings, new RNRenderer('', log), RNPopupSubMenuItem, RNLinkMenuItem, RNCheckedMenuItem, RNMatchMenuItem);

        this.otherContainer.children = [];

        const r = this._renderer;
        this._mainContainer = r.createContainer({ vertical: true });
        r.addContainersToContainer(this._mainContainer, [this.eventContainer, this.otherContainer]);
    }

    addEventMenuItemToMenu(item: RNPopupSubMenuItem, position: number): void {
        this._menuItems.splice(position, 0, item);
        if (this._setEvents) {
            this._setEvents([...this._menuItems]);
        }
    }

    setLastRefrestTimeText(text: string): void {
        if (this._setRefreshTimeText) {
            this._setRefreshTimeText(text);
        }
    }

    addRefreshMenuItem(): void {
        const RefreshItem = () => {
            const [refreshTimeText, setRefreshTimeText] = useState('Never');
            this._setRefreshTimeText = setRefreshTimeText;

            const [container] = this.getRefreshMenuItem(refreshTimeText);
            return container.element();
        };

        this.otherContainer.children?.push(RefreshItem);
    }

    addItemToMenu(item: RNCheckedMenuItem): void {
        this.otherContainer.children!.push(item.item);
    }

    get generator(): ReactElementGenerator {
        return () => {
            const [events, setEvents] = useState<RNPopupSubMenuItem[]>([]);
            this._setEvents = setEvents;

            this.eventContainer.children = events.map(e => e.menu);

            return this._mainContainer.element();
        };
    }
}