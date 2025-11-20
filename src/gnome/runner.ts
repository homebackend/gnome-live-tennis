import St from "gi://St";

import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { Settings } from "../common/settings";
import { MenuRendererCommon } from "../common/menu_renderer";
import { GCheckedMenuItem, GMatchMenuItem, GnomeCheckedMenuItem, GnomeLinkMenuItem, GnomeMatchMenuItem, GnomePopupSubMenuItem } from "./menuItem";
import { GnomeRenderer } from "./renderer";

const ICON_SIZE = 22;

export interface MenuHandler {
    uuid(): string;
    setupBaseMenu(iconPath: string): Promise<void>;
    triggerFetch(): void;
    addEventMenuItem(menuItem: PopupMenu.PopupSubMenuMenuItem, position: number): void;
    addMenuSeparator(): void;
    addItemToMenu(item: typeof GCheckedMenuItem): void;
    addRefreshMenuItem(): St.Label;
    addSettingsItem(): void;
}


export class GnomeRunner extends MenuRendererCommon<St.BoxLayout, St.BoxLayout, St.BoxLayout,
    PopupMenu.PopupSubMenuMenuItem, PopupMenu.PopupMenuItem, typeof GCheckedMenuItem, typeof GMatchMenuItem,
    GnomePopupSubMenuItem, GnomeLinkMenuItem, GnomeCheckedMenuItem, GnomeMatchMenuItem> {
    private _extension: MenuHandler;
    private _refreshLabel?: St.Label;

    constructor(extension: MenuHandler, log: (logs: string[]) => void, settings: Settings, basePath: string) {
        const renderer = new GnomeRenderer(extension.uuid(), basePath, log)
        super(log, settings, basePath, renderer,
            GnomePopupSubMenuItem, GnomeLinkMenuItem, GnomeCheckedMenuItem, GnomeMatchMenuItem, extension.uuid(),
        );
        this._extension = extension;
        this._initRunner();
    }

    private async _initRunner() {
        await this._extension.setupBaseMenu(this.getIconPath());
        await this.setupBaseMenu();
        this._extension.triggerFetch();
    }

    addEventMenuItemToMenu(item: PopupMenu.PopupSubMenuMenuItem, position: number): void {
        this._extension.addEventMenuItem(item.menu, position);
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

    setupAdditionalMenuItems(): void {
    }
};
