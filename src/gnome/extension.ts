// src/extension.ts

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { FloatingScoreWindow } from './floating_window.js';
import { TennisMatch } from '../common/types.js';
import { MenuHandler, GnomeRunner } from './runner.js';
import { Settings } from '../common/settings.js';
import { GnomeSettings } from './settings.js';
import { LiveViewManager, LiveViewUpdater } from '../common/live_view_updater.js';
import { GnomeApiHandler } from './api.js';
import { GCheckedMenuItem } from './menuItem.js';
import { StyleKeys } from '../common/style_keys.js';

const ICON_SIZE = 22;

let _activeFloatingWindows: FloatingScoreWindow[] = [];
let _dataFetchTimeout: number | null = null;
let _matchCycleTimeout: number | null = null;

class LiveScoreButton extends PanelMenu.Button implements MenuHandler {
    private _log: (logs: string[]) => void;
    private _settings: Settings;
    private _extensionPath: string;
    private _uuid: string;
    public runner: GnomeRunner;

    constructor(log: (logs: string[]) => void, settings: Settings, extensionPath: string, uuid: string) {
        super(0.0, 'Live Score Tracker', false);
        this._log = log;
        this._settings = settings;
        this._extensionPath = extensionPath;
        this._uuid = uuid;
        this.runner = new GnomeRunner(this, log, this._settings, extensionPath);
    }

    setupBaseMenu(iconPath: string): void  {
        const gicon = Gio.icon_new_for_string(iconPath);

        this.add_child(new St.Icon({
            gicon: gicon,
            style_class: `${StyleKeys.GnomeSystemStatusIcon} ${StyleKeys.GnomePanelButton}`,
            icon_size: ICON_SIZE
        }));
    }

    uuid(): string {
        return this._uuid;
    }

    addEventMenuItem(menuItem: PopupMenu.PopupSubMenuMenuItem, position: number): void {
        this.menu.addMenuItem(menuItem, position);
    }

    addMenuSeparator(): void {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    addItemToMenu(item: typeof GCheckedMenuItem): void {
        this.menu.addMenuItem(item);
    }

    addRefreshMenuItem(): St.Label {
        const refreshItem = new PopupMenu.PopupMenuItem('', { reactive: true });
        refreshItem.connect('activate', () => {
            this.emit('manual-refresh');
        });
        const refreshLabel = new St.Label({ style_class: StyleKeys.MainMenuRefreshLabel });
        refreshLabel.clutter_text.set_markup(`Last Refresh: <span weight='bold'>Never</span>`);
        refreshItem.actor.add_child(refreshLabel);
        this.menu.addMenuItem(refreshItem);

        return refreshLabel;
    }

    addSettingsItem(): void {
        const settingsItem = new PopupMenu.PopupMenuItem('Settings');
        settingsItem.connect('activate', () => this.emit('open-prefs'));
        this.menu.addMenuItem(settingsItem);
    }

    destroy(): void {
        super.destroy();
        this.runner.destroy();
    }
}

const GObjectLiveScoreButton = GObject.registerClass({
    Signals: { 'open-prefs': {}, 'manual-refresh': {} }
}, LiveScoreButton);

export default class LiveScoreExtension extends Extension implements LiveViewManager {
    private _panelButton?: LiveScoreButton;
    private _settings?: GnomeSettings;
    private _updater?: LiveViewUpdater;
    private _cycleIntervalId: NodeJS.Timeout | undefined;

    constructor(metadata: any) {
        super(metadata);
    }

    setFetchTimer(interval: number, fetcher: () => void): void {
        if (_dataFetchTimeout) {
            GLib.source_remove(_dataFetchTimeout);
        }
        _dataFetchTimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            fetcher();
            return GLib.SOURCE_CONTINUE;
        });
    }

    destroyLiveView() {
        _activeFloatingWindows.forEach(w => w.destroy());
        _activeFloatingWindows = [];
    }

    hideLiveViews(): void {
        _activeFloatingWindows.forEach(w => w.hide());
    }

    getLiveViewCount(): number {
        return _activeFloatingWindows.length;
    }

    async setLiveViewCount(numWindows: number): Promise<void> {
        while (_activeFloatingWindows.length < numWindows) {
            _activeFloatingWindows.push(new FloatingScoreWindow(_activeFloatingWindows.length, this.path, this.uuid, this._log.bind(this), this._settings!));
        }
        while (_activeFloatingWindows.length > numWindows) {
            _activeFloatingWindows.pop()?.destroy();
        }
    }

    updateLiveViewContent(window: number, match: TennisMatch): void {
        _activeFloatingWindows[window].updateContent(match);
    }

    setLiveViewContentsEmpty(window: number): void {
        for (let i = window; i < _activeFloatingWindows.length; i++) {
            _activeFloatingWindows[i].updateContent(undefined);
        }
    }

    setCycleTimeout(interval: number, cycler: () => Promise<boolean>): void {
        this._cycleIntervalId = setInterval(async () => {
            if (await cycler()) {
                this.destroyCycleTimeout();
            }
        }, 1000 * interval);

        //_matchCycleTimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, cycler);
    }

    destroyCycleTimeout(): void {
        if (_matchCycleTimeout) {
            GLib.source_remove(_matchCycleTimeout);
            _matchCycleTimeout = null;
        }

        if (this._cycleIntervalId) {
            clearInterval(this._cycleIntervalId);
        }
    }

    removeCycleTimeout(): boolean {
        return GLib.SOURCE_REMOVE;
    }

    continueCycleTimeout(): boolean {
        return GLib.SOURCE_CONTINUE;
    }

    private _log(logs: string[]) {
        if (this._settings?.getBoolean('enable-debug-logging')) {
            console.log("[Live Tennis]", logs.join(", "));
        }
    }

    private _recreateUI() {
        this.destroyLiveView();
        this._updater!.updateUI();
    }

    enable() {
        const settings = this.getSettings()
        this._settings = new GnomeSettings(settings);
        this._panelButton = new GObjectLiveScoreButton(this._log.bind(this), this._settings, this.path, this.uuid);
        const apiHandler = new GnomeApiHandler(this._log.bind(this));
        this._updater = new LiveViewUpdater(this._panelButton.runner, this, apiHandler, this._settings!, this._log.bind(this));

        this._panelButton.connect('open-prefs', () => this.openPreferences());
        this._panelButton.connect('manual-refresh', () => this._updater!.fetchMatchData());

        ['enabled', 'num-windows', 'selected-matches', 'auto-view-new-matches',
            'match-display-duration', 'enable-atp', 'enable-wta', 'enable-atp-challenger',
            'auto-hide-no-live-matches']
            .forEach(k => settings.connect(`changed::${k}`, () => this._updater!.updateUI()));
        ['live-window-size-x', 'live-window-size-y'].forEach(k => settings.connect(`changed::${k}`, () => this._recreateUI()))

        Main.panel.addToStatusArea(this.uuid, this._panelButton);

        this._updater.fetchMatchData();
    }

    disable() {
        if (_dataFetchTimeout) {
            GLib.source_remove(_dataFetchTimeout);
        }

        this._updater?.disable();
        this.destroyCycleTimeout();
        this.destroyLiveView();

        this._panelButton?.destroy();
        this._panelButton = undefined;
        this._settings = undefined;
        this._updater = undefined;
    }
}
