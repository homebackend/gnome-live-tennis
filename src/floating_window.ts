// src/floating_window.ts

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from '@girs/glib-2.0';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';


import { TennisMatch, TennisPlayer, TennisSetScore, TennisTeam } from './types.js';
import { loadWebImage } from './image_loader.js';

const WINDOW_WIDTH = 450;
const WINDOW_HEIGHT = 400;
const PADDING = 10;

export class FloatingScoreWindow {
    private _extensionPath: string;
    private _uuid: string;
    private _log: (logs: string[]) => void;
    private _windowActor: St.Widget;
    private _windowIndex: number;
    private _mainBox: St.BoxLayout;

    constructor(windowIndex: number, extensionPath: string, uuid: string, log: (logs: string[]) => void) {
        this._extensionPath = extensionPath;
        this._uuid = uuid;
        this._windowIndex = windowIndex;
        this._log = log;

        const closeButtonContainer = new St.Bin({
            child: this._closeButton(),
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.END,
            x_expand: true,
        });

        // Hidden for now - will show post implementation
        closeButtonContainer.hide();

        this._mainBox = new St.BoxLayout({
            vertical: true,
            style_class: 'main-box',
        });

        const mainBoxContainer = new St.Bin({
            child: this._mainBox,
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
        })

        const windowContentContainer = new St.BoxLayout({
            vertical: true,
            y_expand: true,
            x_expand: true
        });
        windowContentContainer.add_child(closeButtonContainer);
        windowContentContainer.add_child(mainBoxContainer);

        this._windowActor = new St.Bin({
            style_class: 'floating-score-window',
            reactive: true,
            can_focus: true,
            child: windowContentContainer,
            //track_hover: true,
            width: WINDOW_WIDTH,
            height: WINDOW_HEIGHT,
        });

        Main.uiGroup.add_child(this._windowActor);

        //this._windowActor.set_offscreen_redirect(imports.gi.Meta.OffscreenRedirect.ALWAYS);

        this.updatePosition();
    }

    _closeButton() {
        const closeButton = new St.Button({
            style_class: 'floating-window-close-button',
            reactive: true,
            can_focus: true,
            child: new St.Icon({
                icon_name: 'window-close-symbolic',
                icon_size: 16
            })
        });

        closeButton.connect('clicked', () => {
            console.log('Close clicked');
            //this.disable();
            //return true;
        });

        return closeButton;
    }

    _createSeparator(): St.BoxLayout {
        let separator = new St.BoxLayout({
            style_class: 'separator', // The CSS class for styling the line
            // You can also set a fixed height here, but it's best done in CSS
            // height: 2, 
        });
        return separator;
    }

    _openURL(url: string): void {
        try {
            let appInfo = Gio.AppInfo.get_default_for_uri_scheme('http');
            if (appInfo) {
                appInfo.launch_uris([url], null);
            } else {
                GLib.spawn_command_line_async(`xdg-open ${url}`);
            }
        } catch (e) {
            GLib.spawn_command_line_async(`xdg-open ${url}`);
        }
    }

    _addEventHeader(eventHeader: St.BoxLayout, match: TennisMatch) {
        const event = match.event;

        const eventType = new St.BoxLayout({ style_class: 'event-type' });
        const url = match.event.eventTypeUrl;
        if (!url) {
            const eventTypeLabel = new St.Label({ text: match.event.type });
            eventType.add_child(eventTypeLabel);
        } else {
            loadWebImage(url, this._uuid, eventType, 40, this._log);
        }

        eventHeader.add_child(eventType);

        const eventDescription = new St.BoxLayout({ vertical: true });
        const eventNameLabel = new St.Label({ text: match.event.title, style_class: 'event-text' });
        eventDescription.add_child(eventNameLabel);
        const locationBox = new St.BoxLayout();
        const eventLocationLabel = new St.Label({ text: `${match.event.city}, ${match.event.country}`, style_class: 'event-text' });
        locationBox.add_child(eventLocationLabel);
        eventDescription.add_child(locationBox);
        if (event.countryCode) {
            const iconPath = `${this._extensionPath}/flags/${event.countryCode.toLowerCase()}.svg`;
            const gicon = Gio.icon_new_for_string(iconPath);
            const flagIcon = new St.Icon({ gicon: gicon, icon_size: 16, style_class: 'player-flag' });
            locationBox.add_child(flagIcon);
        }
        eventHeader.add_child(eventDescription);

        const eventDetails = new St.BoxLayout({ vertical: true, x_expand: true, xAlign: Clutter.ActorAlign.END, yAlign: Clutter.ActorAlign.START });
        if (event.surface) {
            const surface = new St.Label({ text: `${event.surface}/${event.indoor ? 'Indoor' : 'Outdoor'}`, style_class: 'event-text' });
            eventDetails.add_child(surface);
        }
        if (event.prizeMoney && event.prizeMoneyCurrency) {
            eventDetails.add_child(new St.Label({ text: `Prize Money: ${event.prizeMoneyCurrency} ${event.prizeMoney}`, style_class: 'event-text' }))
        }
        if (event.singlesDrawSize && event.doublesDrawSize) {
            eventDetails.add_child(new St.Label({ text: `Draw: ${event.singlesDrawSize}/${event.doublesDrawSize}`, style_class: 'event-text' }));
        }
        eventHeader.add_child(eventDetails);
    }

    _addMatchHeader(box: St.BoxLayout, match: TennisMatch) {
        // Match Header (Quarterfinals, etc.)
        const matchHeader = new St.BoxLayout({ style_class: 'match-header-box' });
        const matchRound = new St.Label({
            text: `${match.roundName}`,
            style_class: 'match-header-label round-label',
        });
        matchHeader.add_child(matchRound);

        const matchStatus = new St.Label({
            text: match.displayStatus,
            style_class: `match-header-label match-status-${match.displayStatus.toLowerCase()}`,
            y_align: Clutter.ActorAlign.START,
        });
        matchHeader.add_child(matchStatus)

        const matchCourt = new St.Label({
            text: match.courtName ?? 'Unknown',
            style_class: 'match-header-label',
            y_align: Clutter.ActorAlign.START,
        });
        matchHeader.add_child(matchCourt);

        const matchDuration = new St.Label({
            text: match.matchTotalTime ?? 'Unknown',
            style_class: 'match-header-label',
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.START,
        });
        matchHeader.add_child(matchDuration);

        box.add_child(matchHeader);
    }

    _addTeam(team: TennisTeam, isDoubles: boolean, row: St.BoxLayout) {
        const teamBox = new St.BoxLayout({ vertical: false, style_class: 'team-box team-row' });

        // Player Info
        const playerInfoBox = new St.BoxLayout({ vertical: true });
        team.players.forEach((p: TennisPlayer) => {
            const playerRow = new St.BoxLayout({ style_class: 'player-row' });

            const playerImage = new St.BoxLayout({ style_class: 'player-image' });
            playerRow.add_child(playerImage);
            const playerImageUrl = p.headUrl
            if (playerImageUrl) {
                loadWebImage(playerImageUrl, this._uuid, playerImage, 25, this._log);
            }

            // Create flag icon from country code
            const iconPath = `${this._extensionPath}/flags/${p.countryCode.toLowerCase()}.svg`;
            const gicon = Gio.icon_new_for_string(iconPath);
            const flagIcon = new St.Icon({ gicon: gicon, icon_size: 16, style_class: 'player-flag' });
            playerRow.add_child(flagIcon);
            playerRow.add_child(new St.Label({ text: team.entryType ? `[${team.entryType}] ` : '' }));

            // Player name label
            let name: string = `<b>${p.firstName} ${p.lastName}</b>`;
            if (team.seed) {
                name += ` (${team.seed})`
            }
            const playerLabel = new St.Label();
            playerLabel.clutter_text.set_markup(name);

            const playerButton = new St.Button({
                style_class: 'link-button',
                reactive: true,
                can_focus: true,
                track_hover: true,
            });

            const playerUrl = `https://www.atptour.com/en/players/${p.firstName.toLowerCase()}-${p.lastName.toLowerCase()}/${p.id}/overview`
            playerButton.set_child(playerLabel);
            playerButton.connect('button-press-event', this._openURL.bind(this, playerUrl));

            playerRow.add_child(playerButton);

            playerInfoBox.add_child(playerRow);
        });
        teamBox.add_child(playerInfoBox);

        row.add_child(teamBox);
    }

    _addScore(team: TennisTeam, alignment: Clutter.ActorAlign, gameScoreStyle: string, isServing: boolean, row: St.BoxLayout) {
        const serviceBox = new St.BoxLayout({ style_class: 'service-box', y_align: alignment });
        if (isServing) {
            const iconPath = `${this._extensionPath}/icons/tennis-icon.png`;
            const gicon = Gio.icon_new_for_string(iconPath);
            const serviceIcon = new St.Icon({
                gicon: gicon,
                icon_size: 16
            })
            serviceBox.add_child(serviceIcon);
        }
        row.add_child(serviceBox);

        const gameScoreLabel = new St.Label({
            text: team.gameScore != null ? String(team.gameScore) : '',
            style_class: `game-score-box`,
            y_align: alignment,
        });
        row.add_child(gameScoreLabel);

        this._formatSetScores(team.setScores).forEach(scoreText => {
            if (!scoreText) {
                return;
            }

            const scoreLabel = new St.Label({ style_class: 'scores-box', y_align: alignment });
            scoreLabel.clutter_text.set_markup(scoreText);
            row.add_child(scoreLabel);
        });
    }

    _addMatchScoreRows(box: St.BoxLayout, match: TennisMatch) {
        const row1 = new St.BoxLayout({ style_class: 'match-content-box' });
        this._addTeam(match.team1, match.isDoubles, row1);
        this._addScore(match.team1, Clutter.ActorAlign.END, 'game-score-box-top', match.server == 0, row1);
        box.add_child(row1);

        box.add_child(this._createSeparator());

        const row2 = new St.BoxLayout({ style_class: 'match-content-box' });
        this._addTeam(match.team2, match.isDoubles, row2);
        this._addScore(match.team2, Clutter.ActorAlign.START, 'game-score-box-bot', match.server == 1, row2);
        box.add_child(row2);
    }

    _addExtrasRows(box: St.BoxLayout, match: TennisMatch) {
        if (match.umpireLastName && match.umpireFirstName) {
            const row = new St.BoxLayout();
            const umpireLabel = new St.Label({
                text: `Ump: ${match.umpireFirstName} ${match.umpireLastName}`,
                x_expand: true,
                style_class: 'small-text-label'
            });
            row.add_child(umpireLabel);

            box.add_child(row);
        }

        const message = new St.Label({ text: match.message, style_class: 'small-text-label' });
        box.add_child(message);
    }

    updateContent(match: TennisMatch | undefined) {
        this._mainBox.remove_all_children();

        if (!match) {
            this._windowActor.hide();
            return;
        }

        this._windowActor.show();

        const eventHeader = new St.BoxLayout();
        this._addEventHeader(eventHeader, match);
        this._mainBox.add_child(eventHeader);

        const box = new St.BoxLayout({ vertical: true, style_class: 'sub-main-box' });

        this._addMatchHeader(box, match);
        box.add_child(this._createSeparator());
        this._addMatchScoreRows(box, match);
        box.add_child(this._createSeparator());
        this._addExtrasRows(box, match);
        this._mainBox.add_child(box);
    }

    updatePosition() {
        const primary = Main.layoutManager.primaryMonitor;
        const x = primary.x + primary.width - WINDOW_WIDTH - PADDING;
        const y = primary.y + primary.height - PADDING - ((this._windowIndex + 1) * (WINDOW_HEIGHT + PADDING));
        this._windowActor.set_position(x, y);
    }

    hide() {
        this._windowActor.hide();
    }

    destroy() {
        Main.uiGroup.remove_child(this._windowActor);
        this._windowActor.destroy();
    }

    _formatSetScores(scores: TennisSetScore[]): string[] {
        if (!scores || scores.length === 0) {
            return [''];
        }

        return scores.filter(s => s.score).map(s => {
            let scoreString = `${s.score}`;
            if (s.tiebrake) {
                scoreString += `<sup>${s.tiebrake}</sup>`;
            }
            return scoreString;
        });
    }
}
