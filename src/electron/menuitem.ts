import { CheckedMenuItem, CheckedMenuItemProperties, LinkMenuItemProperties, MatchMenuItem, MatchMenuItemProperties, MatchMenuItemRenderer, MenuItem, PopubSubMenuItemProperties, PopupSubMenuItem } from "../common/menuitem.js";
import { Renderer } from "../common/renderer.js";
import { TennisMatch } from "../common/types.js";
import { ElectronRenderer } from "./renderer.js";
import { StyleKeys } from "../common/style_keys.js";

abstract class MenuItemRenderer extends MatchMenuItemRenderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement> {
    protected addCheckmark(div: HTMLDivElement, isVisible: boolean, toggleHandler: ((value: boolean) => void) | undefined): HTMLSpanElement {
        const element = this.r.addTextToContainer(div, {
            text: '✓',
            className: StyleKeys.MainMenuCheckMark,
            visibility: isVisible ? 'visible' : 'hidden',
        });
        this.r.addOnClickHandler(element, () => {
            const parent = element.parentElement;
            if (parent) {
                if (parent.style.visibility === 'hidden') {
                    parent.style.visibility = 'visible';
                } else {
                    parent.style.visibility = 'hidden';
                }
                if (toggleHandler) {
                    toggleHandler(parent.style.visibility === 'visible');
                }
            }
        });

        return element;
    }
}

export class ElectronPopupSubMenuItem extends ElectronRenderer implements PopupSubMenuItem<HTMLDivElement, HTMLDivElement> {
    private _menu: HTMLDivElement;
    private _menuContainer: HTMLDivElement;
    private _menuIndicator: HTMLSpanElement;

    constructor(properties: PopubSubMenuItemProperties) {
        super(properties.basePath, properties.log);
        [this._menu, this._menuContainer, this._menuIndicator] = this._setup(properties);
    }

    private _setup(properties: PopubSubMenuItemProperties): [HTMLDivElement, HTMLDivElement, HTMLSpanElement] {
        const eventElement = this.createContainer({ className: StyleKeys.MainMenuTournamentItem, xExpand: true });
        if (properties.url) {
            this.addImageToContainer(eventElement, { src: properties.url, alt: properties.event.type, height: 20 });
        }
        this.addTextToContainer(eventElement, { text: properties.text, className: StyleKeys.NoWrapText, xExpand: true });
        const indicator = this.addTextToContainer(eventElement, { text: '▶', className: StyleKeys.MainMenuEventIndicator });

        const menuContainer = this.createContainer({ xExpand: true });
        menuContainer.style.display = 'none'; // Hide matches on start
        const wrapper = this.createContainer({ vertical: true, xExpand: true });
        this.addContainersToContainer(wrapper, [eventElement, menuContainer]);

        this.addOnClickHandler(eventElement, () => {
            const currentDisplay = menuContainer.style.display;

            // Hide other sub menu
            if (properties.clickHandler) {
                properties.clickHandler();
            }

            // Toggle this sub menus display
            if (currentDisplay === 'none') {
                menuContainer.style.display = 'block';
                indicator.textContent = '▼';
            } else {
                menuContainer.style.display = 'none';
                indicator.textContent = '▶';
            }
        });

        return [wrapper, menuContainer, indicator];
    }

    get menu(): HTMLDivElement {
        return this._menu;
    }

    addMenuItem(item: MenuItem<HTMLDivElement>): void {
        this.addContainersToContainer(this._menuContainer, item.item);
    }

    hide(): void {
        this._menuContainer.style.display = 'none';
        this._menuIndicator.textContent = '▶';
    }

    destroy(): void {
        this._menu.innerHTML = '';
        const parent = this._menu.parentElement;
        if (parent) {
            parent.removeChild(this._menu);
        }
    }
}

export class ElectronLinkMenuItem extends ElectronRenderer implements MenuItem<HTMLDivElement> {
    protected _item: HTMLDivElement;

    constructor(properties: LinkMenuItemProperties) {
        super(properties.basePath, properties.log);
        this._item = this.createContainer({ xExpand: true, className: StyleKeys.MainMenuMatchItem });
        properties.menuUrls.forEach(menuUrl => this.addTextToContainer(this._item, {
            text: menuUrl.title,
            link: menuUrl.url,
            paddingRight: '5px',
        }));
    }

    get item(): HTMLDivElement {
        return this._item;
    }

    connect(action: string, handler: () => void): void {
        this._item.addEventListener(action, handler);
    }

    destroy(): void {
        this._item.innerHTML = '';
    }
}

class CheckedMenuItemCommon extends MenuItemRenderer implements CheckedMenuItem<HTMLDivElement> {
    protected _checked: boolean;
    protected _checkmark: HTMLSpanElement;
    protected _item: HTMLDivElement;
    protected _itemData: HTMLDivElement;

    constructor(r: Renderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement>, checked: boolean, clickHandler?: (checked: boolean) => void) {
        super(r);
        this._checked = checked;
        [this._item, this._checkmark, this._itemData] = this._create(checked, clickHandler);
    }

    private _create(checked: boolean, clickHandler?: (checked: boolean) => void): [HTMLDivElement, HTMLSpanElement, HTMLDivElement] {
        const item = this.r.createContainer({ className: StyleKeys.MainMenuMatchItem, xExpand: true });
        const checkMarkItem = this.addCheckmark(item, checked, clickHandler);
        const itemData = this.r.createContainer({ xExpand: true });
        this.r.addOnClickHandler(itemData, () => checkMarkItem.click());
        this.r.addContainersToContainer(item, itemData);

        return [item, checkMarkItem, itemData];
    }

    get checked(): boolean {
        return this._checked;
    }

    set checked(checked: boolean) {
        if (checked != this._checked) {
            this._checkmark.click();
        }
    }

    get item(): HTMLDivElement {
        return this._item;
    }

    connect(action: string, handler: () => void): void {
        this._item.addEventListener(action, handler);
    }

    destroy(): void {
        this._item.innerHTML = '';
        const parent = this._item.parentElement;
        if (parent) {
            parent.removeChild(this._item);
        }
    }
}

export class ElectronCheckedMenuItem extends CheckedMenuItemCommon {
    constructor(properties: CheckedMenuItemProperties, r: Renderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement>) {
        super(r, properties.checked, properties.clickHandler);
        this.r.addTextToContainer(this._itemData, { text: properties.text, xExpand: true, className: StyleKeys.NoWrapText });
    }
};

export class ElectronMatchMenuItem extends CheckedMenuItemCommon {
    private _match: TennisMatch;

    constructor(properties: MatchMenuItemProperties, r: Renderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement>) {
        super(r, properties.checked, properties.clickHandler);

        this._match = properties.match;
        this.updateMatchData(this._itemData, this._match);
    }

    set match(match: TennisMatch) {
        this._match = match;
        this._itemData.innerHTML = '';
        this.updateMatchData(this._itemData, this._match);
    }
};
