import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St'

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { TennisMatch } from '../common/types';
import { CheckedMenuItem, CheckedMenuItemProperties, LinkMenuItemProperties, MatchMenuItem, MatchMenuItemProperties, MatchMenuItemRenderer, MenuItem, PopubSubMenuItemProperties, PopupSubMenuItem } from '../common/menuitem';
import { loadPopupMenuGicon } from './image_loader';
import { Renderer } from '../common/renderer';
import { GnomeRenderer } from './renderer';
import { StyleKeys } from '../common/style_keys';

export const GCheckedMenuItem = GObject.registerClass({

    Signals: {
        'toggle': { param_types: [Clutter.Event.$gtype] },
    },

}, class GCheckedMenuItem extends PopupMenu.PopupBaseMenuItem {
    private _checked: boolean = false;
    private _clickHandler?: (checked: boolean) => void;

    _init(constructProperties?: CheckedMenuItemProperties) {
        super._init({ reactive: true });

        const text = constructProperties?.text ?? '';
        this._checked = constructProperties?.checked ?? false;
        this._clickHandler = constructProperties?.clickHandler;

        const label = new St.Label({ text: text });
        this.actor.add_child(label);
        this._updateOrnament();
        this.actor._delegate = this;
    }

    get checked() {
        return this._checked;
    }

    // prevents menu from being closed
    activate(event) {
        this._checked = !this._checked;
        this._updateOrnament();
        this.emit('toggle', event);

        if (this._clickHandler) {
            this._clickHandler(this.checked);
        }
    }

    _updateOrnament() {
        this.setOrnament(this._checked ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
    }
});

interface GMatchMenuItemProperties extends MatchMenuItemProperties {
    renderer: MatchMenuItemRenderer<St.BoxLayout, St.BoxLayout, St.BoxLayout>;
};

export const GMatchMenuItem = GObject.registerClass({

    Signals: {
        'toggle': { param_types: [Clutter.Event.$gtype] },
    },

}, class GMatchMenuItem extends PopupMenu.PopupBaseMenuItem {
    private _clickHandler?: (checked: boolean) => void;
    private _checked: boolean = false;
    private _uuid?: string;
    private _log?: (logs: string[]) => void;

    _init(constructProperties?: GMatchMenuItemProperties) {
        super._init({ reactive: true });

        this._clickHandler = constructProperties?.clickHandler;
        const container = new St.BoxLayout({ x_expand: true, y_align: Clutter.ActorAlign.CENTER });
        this.actor.add_child(container);

        this._checked = constructProperties?.checked ?? false;
        this._uuid = constructProperties?.uuid;
        this._log = constructProperties?.log;

        this._updateOrnament();
        if (constructProperties?.match && constructProperties.renderer) {
            this._updateMenu(constructProperties?.match, constructProperties?.renderer);
        }
        this.actor._delegate = this;
    }

    private _updateMenu(match: TennisMatch, renderer: MatchMenuItemRenderer<St.BoxLayout, St.BoxLayout, St.BoxLayout>) {
        const children = this.actor.get_children();
        if (children.length < 2) {
            console.log('No children')
            return;
        }
        const container = children[1];
        container.remove_all_children();
        renderer.updateMatchData(container, match);
    }

    setMatch(match: TennisMatch, renderer: MatchMenuItemRenderer<St.BoxLayout, St.BoxLayout, St.BoxLayout>) {
        this._updateMenu(match, renderer);
    }

    get checked() {
        return this._checked;
    }

    set checked(checked: boolean) {
        this._checked = checked;
        this.state = false;
        this._updateOrnament();
    }

    // prevents menu from being closed
    activate(event) {
        this._checked = !this._checked;
        this._updateOrnament();
        this.emit('toggle', event);

        if (this._clickHandler) {
            this._clickHandler(this.checked);
        }
    }

    _updateOrnament() {
        this.setOrnament(this._checked ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
    }
});

export class GnomePopupSubMenuItem implements PopupSubMenuItem<PopupMenu.PopupSubMenuMenuItem, typeof GCheckedMenuItem | typeof GMatchMenuItem> {
    private _menu: PopupMenu.PopupSubMenuMenuItem;

    constructor(properties: PopubSubMenuItemProperties) {
        this._menu = new PopupMenu.PopupSubMenuMenuItem(properties.text, true);

        if (properties.url && properties.uuid) {
            loadPopupMenuGicon(properties.url, properties.uuid, this._menu, properties.log);
        }
    }

    get menu(): PopupMenu.PopupSubMenuMenuItem {
        return this._menu;
    }

    addMenuItem(item: MenuItem<typeof GCheckedMenuItem | typeof GMatchMenuItem>): void {
        this._menu.menu.addMenuItem(item.item);
    }

    hide(): void {
        throw new Error('Method not implemented.');
    }

    destroy(): void {
        this._menu.destroy();
    }
}

export class GnomeLinkMenuItem implements MenuItem<PopupMenu.PopupMenuItem> {
    private _item: PopupMenu.PopupMenuItem;
    private _renderer: Renderer<St.BoxLayout, St.BoxLayout, St.BoxLayout>;

    constructor(properties: LinkMenuItemProperties, renderer: Renderer<St.BoxLayout, St.BoxLayout, St.BoxLayout>) {
        this._renderer = renderer;
        this._item = new PopupMenu.PopupMenuItem('', { reactive: true });
        const container = renderer.createContainer({ xExpand: true, className: StyleKeys.MainMenuMatchItem });
        this._item.actor.add_child(container);

        properties.menuUrls.forEach(menuUrl => renderer.addTextToContainer(container, {
            text: menuUrl.title,
            link: menuUrl.url,
            paddingRight: '5px',
        }));
    }

    get item(): PopupMenu.PopupMenuItem {
        return this._item;
    }

    get generatedItem(): PopupMenu.PopupMenuItem {
        return this._item;
    }

    connect(action: string, handler: () => void): void {
        throw new Error('Method not implemented.');
    }

    destroy(): void {
        this._renderer.destroy();
    }
}

export class GnomeCheckedMenuItem implements CheckedMenuItem<typeof GCheckedMenuItem> {
    private _item: GCheckedMenuItem;

    constructor(properties: CheckedMenuItemProperties) {
        this._item = new GCheckedMenuItem(properties);
        if (properties.clickHandler) {
            this.connect('toggle', () => properties.clickHandler!(this._item.checked));
        }
    }

    get checked(): boolean {
        return this._item.checked;
    }

    get item(): typeof GCheckedMenuItem {
        return this._item;
    }

    get generatedItem(): typeof GCheckedMenuItem {
        return this._item;
    }

    connect(action: string, handler: () => void): void {
        this._item.connect(action, handler);
    }

    destroy(): void {
        this._item.destroy();
    }
};

export class GnomeMatchMenuItem extends MatchMenuItemRenderer<St.BoxLayout, St.BoxLayout, St.BoxLayout> implements MatchMenuItem<typeof GMatchMenuItem> {
    private _item: GMatchMenuItem;

    constructor(properties: MatchMenuItemProperties, r: Renderer<St.BoxLayout, St.BoxLayout, St.BoxLayout>) {
        super(r);

        const gproperties: GMatchMenuItemProperties = { ...properties, renderer: this };
        this._item = new GMatchMenuItem(gproperties);
        if (properties.clickHandler) {
            this.connect('toggle', () => properties.clickHandler!(this._item.checked));
        }
    }

    get checked(): boolean {
        return this._item.checked;
    }

    get item(): typeof GMatchMenuItem {
        return this._item;
    }

    get generatedItem(): typeof GMatchMenuItem {
        return this._item;
    }

    connect(action: string, handler: () => void): void {
        this._item.connect(action, handler);
    }

    destroy(): void {
        this._item.destroy();
    }

    set match(match: TennisMatch) {
        this._item.setMatch(match, this);
    }
}
