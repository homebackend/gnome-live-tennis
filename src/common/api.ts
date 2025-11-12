export enum HttpMethods {
    GET = "GET",
    POST = "POST",
}

export const ApiCommonHeaders = new Map<string, string>([
    ["Cache-Control", "no-cache"],
    ["User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6831.62 Safari/537.36"],
    ["Content-Type", "application/json"],
    ["Accept", "application/json"],
]);

export interface ApiRequest {
    url: string;
    method: HttpMethods;
    headers?: Map<string, string>,
    cookies?: Map<string, string>,
    payload?: Map<string, any>,
    responseCookies?: string[],
}

export interface ApiHandler {
    fetchString(request: ApiRequest): Promise<[string, Map<string, string> | undefined]>;
    fetchJson(request: ApiRequest): Promise<[any, Map<string, string> | undefined]>;
    abort(): void;
};
