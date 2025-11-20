import { ReactElementGenerator, RNElement, RNRenderer } from './renderer';
import { CheckedMenuItem, CheckedMenuItemProperties, LinkMenuItemProperties, MatchMenuItemProperties, MatchMenuItemRenderer, MenuItem, PopubSubMenuItemProperties, PopupSubMenuItem } from '../../src/common/menuitem';
import { getCheckedMenuItem, getLinkMenuItem, getPopupSubMenuItem } from '../../src/common/app/menuitem';
import { useState } from 'react';
import { Renderer } from '../../src/common/renderer';
import { StyleKeys } from '../../src/common/style_keys';
import { TennisMatch } from '../../src/common/types';

export class RNPopupSubMenuItem extends RNRenderer implements PopupSubMenuItem<ReactElementGenerator, ReactElementGenerator> {
    private _properties: PopubSubMenuItemProperties;
    private _menuItems: CheckedMenuItemCommon[] = [];
    private _setIsExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
    private _setMenuItems?: React.Dispatch<React.SetStateAction<CheckedMenuItemCommon[]>>;

    constructor(properties: PopubSubMenuItemProperties) {
        super(properties.basePath, properties.log);
        this._properties = properties;
    }

    get menu(): ReactElementGenerator {
        return () => {
            const [isExpanded, setIsExpanded] = useState(false);
            this._setIsExpanded = setIsExpanded;
            const [menuItems, setMenuItems] = useState(this._menuItems);
            this._setMenuItems = setMenuItems;

            const [menu] = getPopupSubMenuItem(isExpanded, (handler) => {
                handler()
                setIsExpanded(!isExpanded);
            }, this._properties, this);

            if (!menu.children) {
                menu.children = [];
            }
            menu.children = [...menu.children, ...menuItems.map(i => i.item)];
            return menu.element();
        };
    }

    addMenuItem(item: MenuItem<ReactElementGenerator>): void {
        if (item instanceof CheckedMenuItemCommon) {
            item.parent = this;
            this._menuItems.push(item);
            if (this._setMenuItems) {
                this._setMenuItems([...this._menuItems]);
            }
        }
    }

    removeMenuItem(item: CheckedMenuItemCommon): void {
        this._menuItems = this._menuItems.filter(i => i !== item);
        if (this._setMenuItems) {
            this._setMenuItems([...this._menuItems]);
        }
    }

    hide(): void {
        if (this._setIsExpanded) {
            this._setIsExpanded(false);
        }
    }

    destroy(): void {
        super.destroy();
    }
}

export class RNLinkMenuItem extends RNRenderer implements MenuItem<ReactElementGenerator> {
    private _properties: LinkMenuItemProperties;

    constructor(properties: LinkMenuItemProperties) {
        super(properties.basePath, properties.log);
        this._properties = properties;
    }

    get item(): ReactElementGenerator {
        return () => {
            const item = getLinkMenuItem(this._properties, this);
            return item.element();
        };
    }
}

abstract class CheckedMenuItemCommon extends MatchMenuItemRenderer<RNElement, RNElement, RNElement> implements CheckedMenuItem<ReactElementGenerator> {
    private _checked: boolean;
    private _setChecked?: React.Dispatch<React.SetStateAction<boolean>>;
    private _clickHandler?: (checked: boolean) => void;
    private _parent?: RNPopupSubMenuItem;

    constructor(r: Renderer<RNElement, RNElement, RNElement>, checked: boolean, clickHandler?: (checked: boolean) => void) {
        super(r);
        this._checked = checked;
        this._clickHandler = clickHandler;
    }

    get checked(): boolean {
        return this._checked;
    }

    set checked(checked: boolean) {
        if (this._setChecked) {
            this._setChecked(checked);
        }
    }

    protected abstract addItemData(itemData: RNElement): void;

    get item(): ReactElementGenerator {
        return () => {
            const [isChecked, setChecked] = useState(this._checked);
            this._setChecked = setChecked;

            const [item, , itemData] = getCheckedMenuItem(this.r, isChecked, () => {
                setChecked(!isChecked);
                if (this._clickHandler) {
                    this._clickHandler(!isChecked);
                }
            });

            this.addItemData(itemData);

            return item.element();
        };
    }

    set parent(parent: RNPopupSubMenuItem) {
        this._parent = parent;
    }

    destroy(): void {
        if (this._parent) {
            this.parent.removeMenuItem(this);
        }
    }
}

export class RNCheckedMenuItem extends CheckedMenuItemCommon {
    private _properties: CheckedMenuItemProperties;

    constructor(properties: CheckedMenuItemProperties, r: Renderer<RNElement, RNElement, RNElement>) {
        super(r, properties.checked, properties.clickHandler);
        this._properties = properties;
    }

    protected addItemData(itemData: RNElement): void {
        this.r.addTextToContainer(itemData, { text: this._properties.text, xExpand: true, className: StyleKeys.NoWrapText });
    }
}

export class RNMatchMenuItem extends CheckedMenuItemCommon {
    private _match: TennisMatch;
    private _setMatch?: React.Dispatch<React.SetStateAction<TennisMatch>>;

    constructor(properties: MatchMenuItemProperties, r: Renderer<RNElement, RNElement, RNElement>) {
        super(r, properties.checked, properties.clickHandler);
        this._match = properties.match;
    }

    protected addItemData(itemData: RNElement): void {
        this.updateMatchData(itemData, this._match);
    }

    get item(): ReactElementGenerator {
        return () => {
            const [match, setMatch] = useState(this._match);
            this._match = match;
            this._setMatch = setMatch;

            return super.item();
        };
    }

    set match(match: TennisMatch) {
        if (this._setMatch) {
            this._setMatch(match);
        }
    }
}
