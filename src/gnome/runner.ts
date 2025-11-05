import St from "gi://St";

import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { Settings } from "../common/settings.js";
import { MenuRendererCommon } from "../common/menu_renderer.js";
import { GCheckedMenuItem, GMatchMenuItem, GnomeCheckedMenuItem, GnomeMatchMenuItem, GnomePopupSubMenuItem } from "./menuItem.js";
import { GnomeRenderer } from "./renderer.js";

const ICON_SIZE = 22;

export interface MenuHandler {
    uuid(): string;
    setupBaseMenu(iconPath: string): void /*[refreshItem: PopupMenu.PopupMenuItem, refreshLabel: St.Label, settingsItem: PopupMenu.PopupMenuItem]*/;
    addEventMenuItem(menuItem: PopupMenu.PopupSubMenuMenuItem, position: number): void;
    addMenuSeparator(): void;
    addItemToMenu(item: typeof GCheckedMenuItem): void;
    addRefreshMenuItem(): St.Label;
    addSettingsItem(): void;
}


export class GnomeRunner extends MenuRendererCommon<St.BoxLayout, St.BoxLayout, St.BoxLayout, PopupMenu.PopupSubMenuMenuItem, typeof GCheckedMenuItem, typeof GMatchMenuItem,
    GnomePopupSubMenuItem, GnomeCheckedMenuItem, GnomeMatchMenuItem> {
    private _extension: MenuHandler;
    private _refreshLabel?: St.Label;

    constructor(extension: MenuHandler, log: (logs: string[]) => void, settings: Settings, basePath: string) {
        const renderer = new GnomeRenderer(extension.uuid(), basePath, log)
        super(log, settings, basePath, renderer,
            GnomePopupSubMenuItem, GnomeCheckedMenuItem, GnomeMatchMenuItem,
        );
        this._extension = extension;

        this._extension.setupBaseMenu(this.getIconPath());
        this.setupBaseMenu();
    }

    addEventMenuItemToMenu(item: PopupMenu.PopupSubMenuMenuItem, position: number): void {
        this._extension.addEventMenuItem(item, position);
    }

    setLastRefrestTimeText(text: string): void {
        if (this._refreshLabel) {
            this._refreshLabel.clutter_text.set_markup(text);
        }
    }

    addMenuSeprator(): void {
        this._extension.addMenuSeparator();
    }

    addItemToMenu(item: GnomeCheckedMenuItem): void {
        this._extension.addItemToMenu(item.item);
    }

    addRefreshMenuItem(): void {
        this._refreshLabel = this._extension.addRefreshMenuItem();
    }

    addSettingsItem(): void {
        this._extension.addSettingsItem();
    }
};
