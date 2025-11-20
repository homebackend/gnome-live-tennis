import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings } from '../../src/common/settings';
import { schema, Schema } from '../../src/common/schema';

const SETTINGS_KEY = 'live_tennis_settings';

class SettingsManager {
    static async loadSettings(): Promise<Schema> {
        const defaultEntries = (Object.keys(schema) as (keyof Schema)[]).map(key => [
            key,
            schema[key].default
        ]);

        const defaultSettings: Schema = Object.fromEntries(defaultEntries) as Schema;

        try {
            const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
            const storedSettings: Partial<Schema> = jsonValue != null ? JSON.parse(jsonValue) : {};
            return { ...defaultSettings, ...storedSettings };
        } catch (e) {
            console.error("Error loading settings:", e);
            return defaultSettings;
        }
    }

    static async saveSetting<K extends keyof Schema>(key: K, value: Schema[K]): Promise<Schema> {
        if (!schema[key]) {
            console.warn(`Attempted to save unknown setting key: ${String(key)}`);
            return {} as Schema;
        }

        try {
            const currentSettings = await this.loadSettings();
            currentSettings[key] = value;
            const jsonValue = JSON.stringify(currentSettings);
            await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
            return currentSettings;
        } catch (e) {
            console.error("Error saving setting:", e);
            return {} as Schema;
        }
    }
}


export class RNSettings implements Settings {
    private settings?: Schema;

    async initialize() {
        this.settings = await SettingsManager.loadSettings();
    }

    private async _getValue<K extends keyof Schema>(key: K): Promise<Schema[K]> {
        return this.settings![key];
    }

    async getBoolean(key: string): Promise<boolean> {
        return (await this._getValue(key as keyof Schema)) as boolean;
    }

    async getStrv(key: string): Promise<string[]> {
        return (await this._getValue(key as keyof Schema)) as string[];
    }

    async getInt(key: string): Promise<number> {
        return (await this._getValue(key as keyof Schema)) as number;
    }

    async setBoolean(key: string, value: boolean): Promise<void> {
        this.settings = await SettingsManager.saveSetting(key as keyof Schema, value);
    }

    async setInt(key: string, value: number): Promise<void> {
        this.settings = await SettingsManager.saveSetting(key as keyof Schema, value);
    }

    async setStrv(key: string, value: string[]): Promise<void> {
        this.settings = await SettingsManager.saveSetting(key as keyof Schema, value);
    }
}
