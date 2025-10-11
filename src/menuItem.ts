import Gio from '@girs/gio-2.0';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { TennisMatch, TennisTeam } from './types';
import { loadGicon } from './image_loader';
import { extension } from '@girs/gnome-shell/dist/extensions';

export const CheckedMenuItem = GObject.registerClass({

    Signals: {
        'toggle': { param_types: [Clutter.Event.$gtype] },
    },

}, class CheckedMenuItem extends PopupMenu.PopupBaseMenuItem {
    private _checked: boolean;

    constructor(text: string, checked: boolean) {
        super();

        this._checked = checked!;

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
    }

    _updateOrnament() {
        this.setOrnament(this._checked ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
    }
});

export const MatchMenuItem = GObject.registerClass({

    Signals: {
        'toggle': { param_types: [Clutter.Event.$gtype] },
    },

}, class MatchMenuItem extends PopupMenu.PopupBaseMenuItem {
    private _extensionPath: string;
    private _container: St.BoxLayout;
    private _scoreContainer: St.BoxLayout;
    private _match: TennisMatch;
    private _checked: boolean;
    private _uuid: string;
    private _log: (logs: string[]) => void;

    constructor(
        extensionPath: string,
        match: TennisMatch,
        checked: boolean,
        uuid: string,
        log: (logs: string[]) => void,
    ) {
        super();

        this._extensionPath = extensionPath;
        this._container = new St.BoxLayout();
        this._scoreContainer = new St.BoxLayout({ x_expand: true, x_align: Clutter.ActorAlign.END });

        this._match = match;
        this._checked = checked!;
        this._uuid = uuid;
        this._log = log;

        this.actor.add_child(this._container);
        this._updateOrnament();
        this._updateMenu();
        this.actor.add_child(this._scoreContainer);
        this.actor._delegate = this;
    }

    _updateMenu() {
        this._container.remove_all_children();
        this._scoreContainer.remove_all_children();

        this._addTeam(this._match.team1);
        this._container.add_child(new St.Label({ text: ' vs' }));
        this._addTeam(this._match.team2);
        if (this._match.displayScore) {
            this._scoreContainer.add_child(new St.Label({ text: this._match.displayScore }));
        }
    }

    _addTeam(team: TennisTeam) {
        team.players.forEach(p => {
            const url = p.headUrl;
            if (url) {
                const icon = new St.Icon({ style_class: 'popup-menu-icon' });
                loadGicon(url, this._uuid, icon, this._log);
                this._container.add_child(icon);
            }
            const iconPath = `${this._extensionPath}/flags/${p.countryCode.toLowerCase()}.svg`;
            const gicon = Gio.icon_new_for_string(iconPath);
            const flagIcon = new St.Icon({ gicon: gicon, icon_size: 16, style_class: 'player-flag' });
            this._container.add_child(flagIcon);
        });

        this._container.add_child(new St.Label({ text: team.displayName }));
    }

    set match(match: TennisMatch) {
        this._match = match;
        this._updateMenu();
    }

    get checked() {
        return this._checked;
    }

    // prevents menu from being closed
    activate(event) {
        this._log(['Menuitem event activated', this._match.displayName]);
        this._checked = !this._checked;
        this._updateOrnament();
        this.emit('toggle', event);
    }

    _updateOrnament() {
        this.setOrnament(this._checked ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
    }
});
