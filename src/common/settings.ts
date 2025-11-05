export interface Settings {
    getBoolean(key: string): Promise<boolean>;
    getStrv(key: string): Promise<string[]>;
    getInt(key: string): Promise<number>;
    setBoolean(key: string, value: boolean): Promise<void>;
    setInt(key: string, value: number): Promise<void>;
    setStrv(key: string, value: string[]): Promise<void>;
};
