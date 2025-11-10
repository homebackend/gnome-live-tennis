import { spawn } from 'child_process';
import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { ApiHandler, ApiRequest } from '../common/api.js';
import qs from 'qs';

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
            data: request.payload ? qs.stringify(request.payload) : undefined,
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

                this._log(['Received response']);
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
                this._log([`Error fetching data: ${axiosError.message}`]);

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

    public async fetchString(request: ApiRequest): Promise<[any, Map<string, string> | undefined]> {
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

export class CurlApiHandler implements ApiHandler {
    private _log: (logs: string[]) => void;
    private _abortController: AbortController | null = null;

    constructor(log: (logs: string[]) => void) {
        this._log = log;
    }

    private async _fetch<T>(request: ApiRequest): Promise<[any, Map<string, string> | undefined]> {
        this._log(['Executing curl command for URL:', request.url]);

        if (this._abortController) {
            this._log(['Warning: New request started before previous one finished/aborted. Aborting previous.']);
            this._abortController.abort();
        }

        const currentAbortController = new AbortController();
        this._abortController = currentAbortController;

        return new Promise<[any, Map<string, string> | undefined]>((resolve) => {
            const curlArgs: string[] = ['-X', request.method, request.url];
            const headers: Record<string, string> = {};

            if (request.headers) {
                request.headers.forEach((value, key) => (headers[key] = value));
            }

            if (request.cookies) {
                const cookieString = Array.from(request.cookies.entries())
                    .map(([key, value]) => `${key}=${value}`)
                    .join('; ');
                headers['Cookie'] = cookieString;
            }

            for (const key in headers) {
                curlArgs.push('-H', `${key}: ${headers[key]}`);
            }

            curlArgs.push('-i', '-L', '--silent');

            this._log(['Curl command:', `curl ${curlArgs.join(' ')}`]);
            const curlProcess = spawn('curl', curlArgs);

            let rawResponse = '';
            let errorOutput = '';

            curlProcess.stdout.on('data', (data: Buffer) => {
                rawResponse += data.toString();
            });

            curlProcess.stderr.on('data', (data: Buffer) => {
                errorOutput += data.toString();
            });

            const cleanup = () => {
                if (this._abortController === currentAbortController) {
                    this._abortController = null;
                }
            };

            currentAbortController.signal.addEventListener('abort', () => {
                this._log(['Abort signal received. Killing curl process.']);
                curlProcess.kill('SIGTERM');
                cleanup();
                resolve([undefined, undefined]);
            });

            curlProcess.on('close', (code) => {
                cleanup();

                if (code !== 0) {
                    if (currentAbortController.signal.aborted) return;

                    this._log([`Curl process exited with code ${code}`]);
                    this._log(['Curl error output:', errorOutput]);
                    return resolve([undefined, undefined]);
                }

                const parts = rawResponse.split('\r\n\r\n');
                const responseBody = parts.pop() || parts.pop() || '';
                const headerBlock = parts.join('\r\n\r\n');

                const statusMatches = headerBlock.match(/HTTP\/[\d.]+ (\d{3})/g);
                const statusCode = statusMatches ? parseInt(statusMatches[statusMatches.length - 1].split(' ')[1]) : 200;

                let responseCookies: Map<string, string> | undefined;
                if (request.responseCookies) {
                    responseCookies = new Map<string, string>();
                    const cookieMatches = headerBlock.match(/Set-Cookie: (.+?)\r\n/gi);
                    if (cookieMatches) {
                        cookieMatches.forEach(match => {
                            const cookieKeyVal = match.replace(/Set-Cookie: /gi, '').split(';')[0];
                            const [key, value] = cookieKeyVal.split('=');
                            if (request.responseCookies?.includes(key)) {
                                responseCookies!.set(key, value);
                            }
                        });
                    }
                }

                if (statusCode >= 200 && statusCode < 300) {
                    this._log(['Received response status:', statusCode.toString()]);
                    // The generic T expects the raw responseBody if T is string
                    resolve([responseBody as unknown as T, responseCookies]);
                } else {
                    this._log([`Remote server error: ${statusCode}`, responseBody]);
                    resolve([undefined, responseCookies]);
                }
            });

            curlProcess.on('error', (err) => {
                cleanup();
                this._log([`Failed to start curl process: ${err.message}`]);
                resolve([undefined, undefined]);
            });
        });
    }

    public async fetchString(request: ApiRequest): Promise<[any, Map<string, string> | undefined]> {
        return this._fetch<string>(request);
    }

    public async fetchJson<T>(request: ApiRequest): Promise<[any, Map<string, string> | undefined]> {
        return this._fetch<string>(request).then(([dataString, cookies]) => {
            if (!dataString) {
                return [undefined, cookies];
            }

            try {
                const jsonData = JSON.parse(dataString) as T;
                return [jsonData, cookies];
            } catch (e) {
                this._log(['Failed to parse JSON response', (e as Error).message]);
                return [undefined, cookies];
            }
        });
    }

    public abort(): void {
        if (this._abortController) {
            this._log(['Aborting previous request via controller signal']);
            this._abortController.abort();
            this._abortController = null; // Controller is now used up
        }
    }
}
