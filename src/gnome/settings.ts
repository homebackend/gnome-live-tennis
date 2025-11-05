import Gio from "gi://Gio";
import { Settings } from "../common/settings.js";

export class GnomeSettings implements Settings {
    private _settings: Gio.Settings;

    constructor(settings: Gio.Settings) {
        this._settings = settings;
    }

    async getInt(key: string): Promise<number> {
        return this._settings.get_int(key);
    }

    async getStrv(key: string): Promise<string[]> {
        return this._settings.get_strv(key);
    }

    async getBoolean(key: string): Promise<boolean> {
        return this._settings.get_boolean(key);
    }

    async setStrv(key: string, value: string[]): Promise<void> {
        this._settings.set_strv(key, value);
    }

    async setBoolean(key: string, value: boolean): Promise<void> {
        this._settings.set_boolean(key, value);
    }

    async setInt(key: string, value: number): Promise<void> {
        this._settings.set_int(key, value);
    }
}
