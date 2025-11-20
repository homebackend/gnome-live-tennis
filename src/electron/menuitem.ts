import { CheckedMenuItem, CheckedMenuItemProperties, LinkMenuItemProperties, MatchMenuItem, MatchMenuItemProperties, MatchMenuItemRenderer, MenuItem, PopubSubMenuItemProperties, PopupSubMenuItem } from "../common/menuitem";
import { Renderer } from "../common/renderer";
import { TennisMatch } from "../common/types";
import { ElectronRenderer } from "./renderer";
import { StyleKeys } from "../common/style_keys";
import { getCheckedMenuItem, getLinkMenuItem, getPopupSubMenuItem, TextMenuClosed, TextMenuOpen } from "../common/app/menuitem";

export class ElectronPopupSubMenuItem extends ElectronRenderer implements PopupSubMenuItem<HTMLDivElement, HTMLDivElement> {
    private _menu: HTMLDivElement;
    private _menuContainer: HTMLDivElement;
    private _menuIndicator: HTMLSpanElement;

    constructor(properties: PopubSubMenuItemProperties) {
        super(properties.basePath, properties.log);
        [this._menu, this._menuContainer, this._menuIndicator] = getPopupSubMenuItem(false, (handler) => {
            const currentDisplay = this._menuContainer.style.display;

            handler();

            if (currentDisplay === 'none') {
                this.show();
            } else {
                this.hide();
            }
        }, properties, this);
    }

    get menu(): HTMLDivElement {
        return this._menu;
    }

    addMenuItem(item: MenuItem<HTMLDivElement>): void {
        this.addContainersToContainer(this._menuContainer, item.item);
    }

    show(): void {
        this._menuContainer.style.display = 'block';
        this._menuIndicator.textContent = TextMenuOpen;
    }

    hide(): void {
        this._menuContainer.style.display = 'none';
        this._menuIndicator.textContent = TextMenuClosed;
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
        this._item = getLinkMenuItem(properties, this);
    }

    get item(): HTMLDivElement {
        return this._item;
    }

    get generatedItem(): HTMLDivElement {
        return this._item;
    }

    destroy(): void {
        this._item.innerHTML = '';
    }
}

class CheckedMenuItemCommon extends MatchMenuItemRenderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement> implements CheckedMenuItem<HTMLDivElement> {
    protected _checked: boolean;
    protected _checkmark: HTMLSpanElement;
    protected _item: HTMLDivElement;
    protected _itemData: HTMLDivElement;

    constructor(r: Renderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement>, checked: boolean, clickHandler?: (checked: boolean) => void) {
        super(r);
        this._checked = checked;
        [this._item, this._checkmark, this._itemData] = getCheckedMenuItem(r, checked, () => {
            const parent = this._checkmark.parentElement;
            if (parent) {
                if (parent.style.visibility === 'hidden') {
                    parent.style.visibility = 'visible';
                } else {
                    parent.style.visibility = 'hidden';
                }
                if (clickHandler) {
                    clickHandler(parent.style.visibility === 'visible');
                }
            }
        });
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

    get generatedItem(): HTMLDivElement {
        return this._item
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
