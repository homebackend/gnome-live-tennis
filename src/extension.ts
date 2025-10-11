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
import { TennisMatch, TennisEvent } from './types.js';
import { LiveTennis, QueryResponseType } from './fetcher.js';
import { loadPopupMenuGicon } from './image_loader.js';
import { CheckedMenuItem, MatchMenuItem } from './menuItem.js';
import { SortedStringList } from './utit.js';
import { panelMenu } from '@girs/gnome-shell/dist/ui/index.js';

const ICON_SIZE = 22;

let _activeFloatingWindows: FloatingScoreWindow[] = [];
let _dataFetchTimeout: number | null = null;
let _matchCycleTimeout: number | null = null;
let _currentMatchIndex = 0;

function _log(logs: string[]) {
    console.log("[Live Tennis]", logs.join(", "));
}

class LiveScoreButton extends PanelMenu.Button {
    private _settings: Gio.Settings;
    private _extensionPath: string;
    private _uuid: string;
    private _matchesMenuItems: Map<string, MatchMenuItem> = new Map();
    private _tennisEvents: SortedStringList;
    private _tournamentHeaders: Map<string, PopupMenu.PopupMenuItem> = new Map();
    private _eventAutoItems: Map<string, CheckedMenuItem> = new Map();
    private _refreshItem?: PopupMenu.PopupMenuItem;
    private _refreshLabel?: St.Label;
    private _settingsItem?: PopupMenu.PopupMenuItem;

    constructor(settings: Gio.Settings, extensionPath: string, uuid: string) {
        super(0.0, 'Live Score Tracker', false);
        this._settings = settings;
        this._extensionPath = extensionPath;
        this._uuid = uuid;

        this._tennisEvents = new SortedStringList();

        const iconPath = `${this._extensionPath}/icons/tennis-icon.png`;
        const gicon = Gio.icon_new_for_string(iconPath);

        this.add_child(new St.Icon({
            gicon: gicon,
            style_class: 'system-status-icon livescore-panel-button',
            icon_size: ICON_SIZE
        }));

        this._setupBaseMenu();
        this.setLastRefreshTime(null);
    }

    private _setupBaseMenu() {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const toggleItem = new CheckedMenuItem('Enable live view', this._settings.get_boolean('enabled'));
        toggleItem.connect('toggle', () => this._settings.set_boolean('enabled', toggleItem.checked));
        this.menu.addMenuItem(toggleItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._refreshItem = new PopupMenu.PopupMenuItem('', { reactive: true });
        this._refreshItem.connect('activate', () => {
            this.emit('manual-refresh');
        });
        this._refreshLabel = new St.Label({ style_class: 'livescore-refresh-label' });
        this._refreshLabel.clutter_text.set_markup(`Last Refresh: <span weight='bold'>Never</span>`);
        this._refreshItem.actor.add_child(this._refreshLabel);
        this.menu.addMenuItem(this._refreshItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._settingsItem = new PopupMenu.PopupMenuItem('Settings');
        this._settingsItem.connect('activate', () => this.emit('open-prefs'));
        this.menu.addMenuItem(this._settingsItem);
    }

    setLastRefreshTime(time: GLib.DateTime | null) {
        this._lastRefreshTime = time;
        if (this._refreshLabel) {
            const timeString = time ? time.format('%H:%M:%S') : 'N/A';
            this._refreshLabel.clutter_text.set_markup(`Last Refresh: <span weight='bold'>${timeString}</span>`);
        }
    }

    uniqMatchId(event: TennisEvent, match: TennisMatch): string {
        return `${event.id}-${match.id}`;
    }

    addTournament(event: TennisEvent) {
        if (!this._tournamentHeaders.has(event.id)) {
            _log([`Adding tournament: ${event.title} (${event.id})`]);

            const position = this._tennisEvents.insert(event.title);
            const submenuItem = new PopupMenu.PopupSubMenuMenuItem(event.title, true);
            const eventTypeUrl = event.eventTypeUrl;
            if (eventTypeUrl) {
                loadPopupMenuGicon(eventTypeUrl, this._uuid, submenuItem, _log);
            }

            this.menu.addMenuItem(submenuItem, position);
            this._tournamentHeaders.set(event.id, submenuItem);

            const autoEvents = this._settings.get_strv('auto-view-new-matches');
            const autoItem = new CheckedMenuItem('Auto add new matches', autoEvents.includes(event.id));
            autoItem.connect('toggle', () => this._toggleAutoSelection(event.id));
            submenuItem.menu.addMenuItem(autoItem);
            this._eventAutoItems.set(event.id, autoItem);
        }
    }

    addMatch(event: TennisEvent, match: TennisMatch) {
        if (!this._matchesMenuItems.has(this.uniqMatchId(event, match))) {
            _log(['Adding match', event.title, match.displayName, match.id]);

            const matchId = this.uniqMatchId(event, match);
            let currentSelection = this._settings.get_strv('selected-matches');
            if (!currentSelection.includes(matchId) && !match.hasFinished) {
                const autoEvents = this._settings.get_strv('auto-view-new-matches');
                if (autoEvents.includes(event.id)) {
                    currentSelection.push(matchId);
                    this._settings.set_strv('selected-matches', currentSelection);
                }
            }

            _log([event.title, event.id, match.displayName, match.id, String(match.hasFinished), String(currentSelection.includes(matchId))]);

            const menuItem = new MatchMenuItem(this._extensionPath, match, currentSelection.includes(matchId), this._uuid, _log);
            const submenuItem = this._tournamentHeaders.get(event.id);
            submenuItem.menu.addMenuItem(menuItem);
            menuItem.connect('toggle', () => this._toggleMatchSelection(matchId));
            this._matchesMenuItems.set(this.uniqMatchId(event, match), menuItem);
        } else {
            this.updateMatch(event, match);
        }
    }

    updateMatch(event: TennisEvent, match: TennisMatch) {
        _log(['Updating match', event.title, event.id, match.displayName, match.id]);

        const menuItem = this._matchesMenuItems.get(this.uniqMatchId(event, match));
        if (menuItem) {
            menuItem.match = match;
        }
    }

    removeTournament(event: TennisEvent) {
        _log([`Removing tournament: ${event.title}`]);

        this._tennisEvents.remove(event.title);
        this.filterAutoEvents(s => s !== event.id);

        const autoItem = this._eventAutoItems.get(event.id);
        if (autoItem) {
            autoItem.destroy();
            this._eventAutoItems.delete(event.id);
        }

        const header = this._tournamentHeaders.get(event.id);
        if (header) {
            header.destroy();
            this._tournamentHeaders.delete(event.id);
        }
    }

    removeMatch(event: TennisEvent, match: TennisMatch) {
        _log(['Removinging match', event.title, match.displayName]);

        const matchId = this.uniqMatchId(event, match);
        this.filterLiveViewMatches(id => id !== matchId);

        const matchItem = this._matchesMenuItems.get(matchId);
        if (matchItem) {
            matchItem.destroy();
            this._matchesMenuItems.delete(matchId);
        }
    }

    private _toggleSetting(key: string, toggleValue: string): boolean {
        let stored: boolean;
        let currentValues = this._settings.get_strv(key);
        if (currentValues.includes(toggleValue)) {
            stored = false;
            currentValues = currentValues.filter(v => v !== toggleValue);
        } else {
            stored = true;
            currentValues.push(toggleValue);
        }
        this._settings.set_strv(key, currentValues);
        return stored;
    }

    private _toggleAutoSelection(eventId: string): boolean {
        return this._toggleSetting('auto-view-new-matches', eventId);
    }

    private _toggleMatchSelection(matchId: string) {
        return this._toggleSetting('selected-matches', matchId);
    }

    private _filterSetting(key: string, handler: (selection: string) => boolean): string[] {
        let currentSelection = this._settings.get_strv(key);
        currentSelection = currentSelection.filter(handler);
        this._settings.set_strv(key, currentSelection);
        return currentSelection;
    }

    filterLiveViewMatches(handler: (selection: string) => boolean): string[] {
        return this._filterSetting('selected-matches', handler);
    }

    filterAutoEvents(handler: (selection: string) => boolean): string[] {
        return this._filterSetting('auto-view-new-matches', handler);
    }
}

const GObjectLiveScoreButton = GObject.registerClass({
    Signals: { 'open-prefs': {}, 'manual-refresh': {} }
}, LiveScoreButton);

export default class LiveScoreExtension extends Extension {
    private _panelButton?: LiveScoreButton;
    private _settings?: Gio.Settings;
    private _liveTennis?: LiveTennis;
    private _currentMatchesData: TennisMatch[] = [];

    constructor(metadata) {
        super(metadata);
    }

    async _fetchMatchData() {
        try {
            _log(['Starting _fetchMatchData']);
            const matchIds: Set<string> = new Set();
            const eventIds: Set<String> = new Set();
            const matchesData: TennisMatch[] = [];

            this._liveTennis!.query(
                (r: QueryResponseType, e: TennisEvent) => {
                    if (!this._panelButton) return;
                    if (r === QueryResponseType.AddTournament) {
                        if (e.title) {
                            eventIds.add(e.id);
                            this._panelButton.addTournament(e);
                        } else {
                            _log(['Skipping event having null title', e.id]);
                        }
                    } else if (r === QueryResponseType.UpdateTournament) {
                        eventIds.add(e.id);
                    } else if (r === QueryResponseType.DeleteTournament) {
                        this._panelButton.removeTournament(e);
                    }
                },
                (r: QueryResponseType, e: TennisEvent, m: TennisMatch) => {
                    if (!this._panelButton) return;
                    const matchId = this._panelButton!.uniqMatchId(e, m);
                    if (r === QueryResponseType.AddMatch) {
                        (m as any).eventId = e.id;
                        (m as any).eventTitle = e.title;
                        this._panelButton.addMatch(e, m);
                        matchIds.add(matchId);
                        matchesData.push(m);
                    } else if (r == QueryResponseType.UpdateMatch) {
                        this._panelButton.updateMatch(e, m);
                        matchIds.add(matchId);
                        matchesData.push(m);
                    } else if (r === QueryResponseType.DeleteMatch) {
                        this._panelButton.removeMatch(e, m);
                    }
                },
                () => {
                    this._panelButton?.filterAutoEvents(id => eventIds.has(id));
                    this._panelButton?.filterLiveViewMatches(id => matchIds.has(id));

                    this._currentMatchesData = matchesData;
                    this._updateFloatingWindows(this._currentMatchesData);
                    this._panelButton?.setLastRefreshTime(GLib.DateTime.new_now_local());
                }
            );

            if (_dataFetchTimeout) {
                GLib.source_remove(_dataFetchTimeout);
            }
            _dataFetchTimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._settings!.get_int('update-interval'), () => {
                this._fetchMatchData();
                return GLib.SOURCE_CONTINUE;
            });
        } catch (e) {
            _log(['Error during data fetch', String(e)]);
            if (e instanceof Error) {
                if (e.stack) {
                    _log(['Stack trace', e.stack]);
                }
            }
        }
    }

    _updateUI() {
        this._updateFloatingWindows(this._currentMatchesData);
    }

    _getSelectedMatches(matchesData: TennisMatch[]) {
        const selectedMatchIds = this._settings!.get_strv('selected-matches');
        return matchesData.filter(m => selectedMatchIds.includes(this._panelButton!.uniqMatchId(m.event, m)));
    }

    _updateFloatingWindows(matchesData: TennisMatch[]) {
        if (!this._settings?.get_boolean('enabled')) {
            _activeFloatingWindows.forEach(w => w.hide());
            return;
        }

        const numWindows = this._settings.get_int('num-windows');
        const selectedMatches = this._getSelectedMatches(matchesData);

        _log(['Will create windows', numWindows.toString(), selectedMatches.length.toString()]);

        while (_activeFloatingWindows.length < numWindows) {
            _activeFloatingWindows.push(new FloatingScoreWindow(_activeFloatingWindows.length, this.path, this.uuid, log));
        }
        while (_activeFloatingWindows.length > numWindows) {
            _activeFloatingWindows.pop()?.destroy();
        }

        if (_matchCycleTimeout) {
            GLib.source_remove(_matchCycleTimeout);
            _matchCycleTimeout = null;
        }

        if (selectedMatches.length > numWindows) {
            this._cycleMatches(selectedMatches);
        } else {
            selectedMatches.forEach((match, i) => _activeFloatingWindows[i].updateContent(match));
            for (let i = selectedMatches.length; i < _activeFloatingWindows.length; i++) {
                _activeFloatingWindows[i].updateContent(undefined);
            }
        }
    }

    _cycleMatches(matchesData: TennisMatch[]) {
        const cycle = () => {
            if (!this._settings?.get_boolean('enabled')) {
                _activeFloatingWindows.forEach(w => w.hide());
                return GLib.SOURCE_REMOVE;
            }

            const selectedMatches = this._getSelectedMatches(matchesData);
            if (selectedMatches.length <= _activeFloatingWindows.length) {
                this._updateFloatingWindows(matchesData);
                _matchCycleTimeout = null;
                return GLib.SOURCE_REMOVE;
            }

            for (let i = 0; i < _activeFloatingWindows.length; i++) {
                const matchToShow = selectedMatches[(_currentMatchIndex + i) % selectedMatches.length];
                _activeFloatingWindows[i].updateContent(matchToShow);
            }
            _currentMatchIndex = (_currentMatchIndex + 1) % selectedMatches.length;
            return GLib.SOURCE_CONTINUE;
        };

        cycle();
        _matchCycleTimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._settings!.get_int('match-display-duration'), cycle);
    }

    enable() {
        this._settings = this.getSettings();
        this._liveTennis = new LiveTennis(_log, this._settings!);
        this._panelButton = new GObjectLiveScoreButton(this._settings, this.path, this.uuid);
        this._panelButton.connect('open-prefs', () => this.openPreferences());
        this._panelButton.connect('manual-refresh', () => this._fetchMatchData());

        this._settings.connect('changed::enabled', () => this._updateUI());
        this._settings.connect('changed::num-windows', () => this._updateUI());
        this._settings.connect('changed::selected-matches', () => this._updateUI());
        this._settings.connect('changed::auto-view-new-matches', () => this._updateUI());
        this._settings.connect('changed::match-display-duration', () => this._updateUI());

        Main.panel.addToStatusArea(this.uuid, this._panelButton);
        this._fetchMatchData();
    }

    disable() {
        if (_dataFetchTimeout) GLib.source_remove(_dataFetchTimeout);
        if (_matchCycleTimeout) GLib.source_remove(_matchCycleTimeout);

        _activeFloatingWindows.forEach(w => w.destroy());
        _activeFloatingWindows = [];

        this._panelButton?.destroy();
        this._panelButton = undefined;
        this._settings = undefined;
        this._liveTennis = undefined;
    }
}
