import Store, { Schema as StoreSchemaType } from 'electron-store';
import { schema, Schema, SettingApplicability } from "../common/schema";
import { Settings } from "../common/settings";

export class ElectronSettings implements Settings {
    private _store: Store<Schema>;

    constructor() {
        const storeSchema = {} as StoreSchemaType<Schema>;

        Object.entries(schema).filter(([_, value]) => !value.applicability || value.applicability.includes(SettingApplicability.ElectronTrayApp)).map(([key, value]) => {
            storeSchema[key as keyof Schema] = { type: value.type, default: value.default };
        });

        this._store = new Store<Schema>({ schema: storeSchema });
    }

    private _actualKey(key: string): string {
        return key.replaceAll('-', '_');
    }

    private _get(key: string): any {
        const actualKey = this._actualKey(key);
        const value = this._store.get(actualKey);
        return value;
    }

    async getInt(key: string): Promise<number> {
        return this._get(key) as number;
    }

    async getBoolean(key: string): Promise<boolean> {
        return this._get(key) as boolean;
    }

    async getStrv(key: string): Promise<string[]> {
        return this._get(key) as string[];
    }

    async setInt(key: string, value: number): Promise<void> {
        return this._store.set(this._actualKey(key), value)
    }

    async setBoolean(key: string, value: boolean): Promise<void> {
        this._store.set(this._actualKey(key), value);
    }

    async setStrv(key: string, value: string[]): Promise<void> {
        this._store.set(this._actualKey(key), value);
    }
}
