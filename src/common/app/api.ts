import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { ApiHandler, ApiRequest } from '../api';

export class AxiosApiHandler implements ApiHandler {
    private _log: (logs: string[]) => void;
    private _cancelSignal: AbortController | null = null;

    constructor(log: (logs: string[]) => void) {
        this._log = log;
    }

    private async _fetch(request: ApiRequest): Promise<[any, Map<string, string> | undefined]> {
        this._log(['Fetching url', request.url]);

        if (this._cancelSignal) {
            this._cancelSignal.abort('New request started before previous one finished');
        }

        const abortController = new AbortController();
        this._cancelSignal = abortController;

        const requestConfig: AxiosRequestConfig = {
            url: request.url,
            method: request.method,
            timeout: 60000,
            signal: abortController.signal,
            //data: request.payload ? qs.stringify(Object.fromEntries(request.payload)) : undefined,
            data: request.payload ? Array.from(request.payload.entries()).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`).join('&') : undefined,
        };

        if (request.headers || request.cookies) {
            const requestHeaders: Record<string, string> = {};

            if (request.headers) {
                request.headers.forEach((value, key) => (requestHeaders[key] = value));
            }

            if (request.cookies) {
                requestHeaders['Cookie'] = Array.from(request.cookies.entries())
                    .map(([key, value]) => `${key}=${value}`)
                    .join(';');
            }

            requestConfig.headers = requestHeaders;
        }

        console.log('headers', requestConfig.headers);
        console.log('data', requestConfig.data);

        try {
            const response: AxiosResponse = await axios(requestConfig);

            let responseCookies: Map<string, string> | undefined;
            const cookiesHeader = response.headers['set-cookie'];

            if (cookiesHeader && request.responseCookies) {
                responseCookies = new Map<string, string>();
                cookiesHeader
                    .flatMap(value => value.split(';'))
                    .map(pair => pair.trim().split('='))
                    .filter(values => values.length >= 2 && request.responseCookies?.includes(values[0]))
                    .forEach(([key, value]) => responseCookies!.set(key, value));

                this._log(['Parsed response cookies:', JSON.stringify(Object.fromEntries(responseCookies))]);
            }

            if (response.status >= 200 && response.status < 300) {
                if (response.data === null) {
                    this._log(['Invalid empty response']);
                    return [null, responseCookies];
                }

                return [response.data, responseCookies];
            } else {
                this._log([`Remote server error: ${response.status}`, JSON.stringify(response.data)]);
                return [null, responseCookies]; // Return null data on error
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                this._log(['Request aborted']);
            } else {
                const axiosError = error as AxiosError;
                this._log([`Error fetching data [${request.url}]: ${axiosError.message}`]);

                if (axiosError.response) {
                    this._log([`Error status: ${axiosError.response.status}`]);
                }
            }
            return [null, undefined];
        } finally {
            if (this._cancelSignal === abortController) {
                this._cancelSignal = null;
            }
        }
    }

    public async fetchString(request: ApiRequest): Promise<[string, Map<string, string> | undefined]> {
        return this._fetch(request);
    }

    public async fetchJson(request: ApiRequest): Promise<[any, Map<string, string> | undefined]> {
        const [jsonData, cookies] = await this._fetch(request);

        if (Array.isArray(jsonData) && jsonData.length === 0) {
            this._log(['Received empty data array']);
            return [undefined, cookies];
        }

        return [jsonData, cookies];
    }

    public abort(): void {
        if (this._cancelSignal) {
            this._log(['Aborting previous request']);
            this._cancelSignal.abort();
            this._cancelSignal = null;
        }
    }
}
