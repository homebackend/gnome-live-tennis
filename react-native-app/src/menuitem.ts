import { ReactElementGenerator, RNElement } from './renderer';
import { CheckedMenuItem, CheckedMenuItemProperties, LinkMenuItemProperties, MatchMenuItemProperties, MatchMenuItemRenderer, MenuItem, PopubSubMenuItemProperties, PopupSubMenuItem } from '../../src/common/menuitem';
import { getCheckedMenuItem, getLinkMenuItem, getPopupSubMenuItem } from '../../src/common/app/menuitem';
import { useState } from 'react';
import { Renderer } from '../../src/common/renderer';
import { StyleKeys } from '../../src/common/style_keys';
import { TennisMatch } from '../../src/common/types';
import { RNRunner } from './runner';
import { ScrollView } from 'react-native';
import React from 'react';

export class RNPopupSubMenuItem implements PopupSubMenuItem<ReactElementGenerator, ReactElementGenerator> {
    private _expanded: boolean = false;
    private _properties: PopubSubMenuItemProperties;
    private _renderer: Renderer<RNElement, RNElement, RNElement>;
    private _menuItems: MenuItem<ReactElementGenerator>[] = [];
    private _parent?: RNRunner;

    constructor(properties: PopubSubMenuItemProperties, renderer: Renderer<RNElement, RNElement, RNElement>) {
        this._properties = properties;
        this._renderer = renderer;
    }

    set expanded(expanded: boolean) {
        this._expanded = expanded;
    }

    set parent(parent: RNRunner) {
        this._parent = parent;
    }

    get menu(): ReactElementGenerator {
        const parent = this._parent;
        return () => {
            const [menu, menuContainer] = getPopupSubMenuItem(this._expanded, (handler) => {
                const expanded = this._expanded;
                handler();
                this._expanded = !expanded;
                if (parent) {
                    parent.setExpandEvent(expanded ? null : this);
                }
            }, this._properties, this._renderer);

            // The menu container is empty at this point.
            if (this._expanded) {
                menuContainer.children = this._menuItems.map(mi => mi.item);
            }

            return React.createElement(ScrollView, { horizontal: true, contentContainerStyle: { flexGrow: 1 } }, menu.element());
        };
    }

    addMenuItem(item: MenuItem<ReactElementGenerator>): void {
        if (item instanceof CheckedMenuItemCommon) {
            item.parent = this;
        }
        this._menuItems.push(item);
    }

    removeMenuItem(item: CheckedMenuItemCommon): void {
        this._menuItems = this._menuItems.filter(i => i !== item);
    }

    hide(): void {
        this._expanded = false;
    }

    destroy(): void {
        this._renderer.destroy();
    }
}

export class RNLinkMenuItem implements MenuItem<ReactElementGenerator> {
    private _properties: LinkMenuItemProperties;
    private _renderer: Renderer<RNElement, RNElement, RNElement>;

    constructor(properties: LinkMenuItemProperties, renderer: Renderer<RNElement, RNElement, RNElement>) {
        this._properties = properties;
        this._renderer = renderer;
    }

    get item(): ReactElementGenerator {
        return () => {
            const item = getLinkMenuItem(this._properties, this._renderer);
            return React.createElement(ScrollView, { horizontal: true }, item.element());
        };
    }

    destroy(): void {
        this._renderer.destroy();
    }
}

abstract class CheckedMenuItemCommon extends MatchMenuItemRenderer<RNElement, RNElement, RNElement> implements CheckedMenuItem<ReactElementGenerator> {
    private _checked: boolean;
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

    protected abstract addItemData(itemData: RNElement): void;

    get item(): ReactElementGenerator {
        return () => {
            const [isChecked, setChecked] = useState(this._checked);

            const [item, , itemData] = getCheckedMenuItem(this.r, isChecked, () => {
                this._checked = !isChecked;
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
        this.updateMatchData(itemData, this._match, true);
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
