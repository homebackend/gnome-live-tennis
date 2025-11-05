import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { TennisMatch } from '../common/types.js';
import { CheckedMenuItem, CheckedMenuItemProperties, MatchMenuItem, MatchMenuItemProperties, MatchMenuItemRenderer, MenuItem, PopubSubMenuItemProperties, PopupSubMenuItem } from '../common/menuitem.js';
import { loadPopupMenuGicon } from './image_loader.js';
import { Renderer } from '../common/renderer.js';


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
    private _container?: St.BoxLayout;
    private _match?: TennisMatch;
    private _checked: boolean = false;
    private _uuid?: string;
    private _log?: (logs: string[]) => void;
    private _renderer?: MatchMenuItemRenderer<St.BoxLayout, St.BoxLayout, St.BoxLayout>;

    _init(constructProperties?: GMatchMenuItemProperties) {
        super._init({ reactive: true });

        this._clickHandler = constructProperties?.clickHandler;
        this._container = new St.BoxLayout();

        this._match = constructProperties?.match;
        this._checked = constructProperties?.checked ?? false;
        this._uuid = constructProperties?.uuid;
        this._log = constructProperties?.log;
        this._renderer = constructProperties?.renderer;

        this.actor.add_child(this._container);
        this._updateOrnament();
        this._updateMenu();
        this.actor._delegate = this;
    }

    private _updateMenu() {
        if (this._container) {
            this._container.remove_all_children();

            this._renderer!.updateMatchData(this._container, this.match);
        }
    }

    set match(match: TennisMatch) {
        this._match = match;
        this._updateMenu();
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

export class GnomeCheckedMenuItem implements CheckedMenuItem<typeof GCheckedMenuItem> {
    private _item: GCheckedMenuItem;

    constructor(properties: CheckedMenuItemProperties) {
        this._item = new GCheckedMenuItem(properties);
    }

    get checked(): boolean {
        return this._item.checked;
    }

    get item(): typeof GCheckedMenuItem {
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
    }

    get checked(): boolean {
        return this._item.checked;
    }

    get item(): typeof GMatchMenuItem {
        return this._item;
    }

    connect(action: string, handler: () => void): void {
        this._item.connect(action, handler);
    }

    destroy(): void {
        this._item.destroy();
    }

    set match(match: TennisMatch) {
        this._item.match = match;
    }
}
