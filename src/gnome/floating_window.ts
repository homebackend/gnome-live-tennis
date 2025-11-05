// src/floating_window.ts

import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';


import { TennisMatch } from '../common/types.js';
import { Settings } from '../common/settings.js';
import { LiveViewRendererCommon } from '../common/live_view_renderer.js';
import { GnomeRenderer } from './renderer.js';
import { StyleKeys } from '../electron/style_keys.js';

const PADDING = 10;

export class FloatingScoreWindow extends LiveViewRendererCommon<St.BoxLayout, St.BoxLayout, St.BoxLayout> {
    private _runner: GnomeRenderer;
    private _log: (logs: string[]) => void;
    private _settings: Settings;
    private _windowActor?: St.Widget;
    private _windowIndex: number;
    private _mainBox?: St.BoxLayout;
    private _windowWidth?: number;
    private _windowHeight?: number;

    constructor(windowIndex: number, extensionPath: string, uuid: string, log: (logs: string[]) => void, settings: Settings) {
        const runner = new GnomeRenderer(uuid, extensionPath, log)
        super(extensionPath, runner);
        this._runner = runner;
        this._windowIndex = windowIndex;
        this._log = log;
        this._settings = settings;

        this._setupWindow();
    }

    private async _setupWindow(): Promise<void> {
        this._windowWidth = await this._settings.getInt('live-window-size-x');
        this._windowHeight = await this._settings.getInt('live-window-size-y');

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
            style_class: StyleKeys.LiveViewMainBox,
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
            style_class: StyleKeys.LiveViewFloatingScoreWindow,
            reactive: true,
            can_focus: true,
            child: windowContentContainer,
            //track_hover: true,
            width: this._windowWidth,
            height: this._windowHeight,
        });

        Main.uiGroup.add_child(this._windowActor);

        //this._windowActor.set_offscreen_redirect(imports.gi.Meta.OffscreenRedirect.ALWAYS);

        this.updatePosition();
    }

    private _closeButton() {
        const closeButton = new St.Button({
            style_class: StyleKeys.LiveViewCloseButton,
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

    updateContent(match: TennisMatch | undefined) {
        if (this._mainBox && this._windowActor) {
            this._mainBox.remove_all_children();

            if (!match) {
                this._windowActor.hide();
                return;
            }

            this._windowActor.show();

            this.createMainWindow(this._mainBox, match);
        }
    }

    updatePosition() {
        if (this._windowActor && this._windowWidth && this._windowHeight) {
            const primary = Main.layoutManager.primaryMonitor;
            const x = primary.x + primary.width - this._windowWidth - PADDING;
            const y = primary.y + primary.height - PADDING - ((this._windowIndex + 1) * (this._windowHeight + PADDING));
            this._windowActor.set_position(x, y);
        }
    }

    hide() {
        this._windowActor.hide();
    }

    destroy() {
        Main.uiGroup.remove_child(this._windowActor);
        if (this._windowActor) {
            this._windowActor.destroy();
        }
        this._runner.destroy();
    }
}
