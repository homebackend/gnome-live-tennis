import { spawn, ChildProcess } from 'child_process';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ApiHandler, HttpMethods } from '../common/api.js';

export class AxiosApiHandler implements ApiHandler {
    private _log: (logs: string[]) => void;
    private _cancelSignal: AbortController | null = null;

    constructor(log: (logs: string[]) => void) {
        this._log = log;
    }

    fetchJson(
        url: string,
        method: HttpMethods,
        headers: Map<string, string>,
        handler: (jsonData: any) => any
    ): void {
        this._log(['Fetching url', url]);

        const abortController = new AbortController();
        this._cancelSignal = abortController;

        const requestHeaders: Record<string, string> = {};
        headers.forEach((value, key) => (requestHeaders[key] = value));

        const requestConfig: AxiosRequestConfig = {
            url: url,
            method: "GET",
            headers: requestHeaders,
            timeout: 60000,
            signal: abortController.signal,
        };

        axios(requestConfig)
            .then(response => {
                if (response.status >= 200 && response.status < 300) {
                    if (response.data === null) {
                        this._log(['Invalid empty response']);
                        return handler(null);
                    }
                    if (Array.isArray(response.data) && response.data.length === 0) {
                        this._log(['Received empty data array']);
                        return handler(null);
                    }
                    this._log(['Received response']);
                    handler(response.data);
                } else {
                    this._log([`Remote server error: ${response.status}`, JSON.stringify(response.data)]);
                    handler(null);
                }
            })
            .catch((error: AxiosError) => {
                if (axios.isCancel(error)) {
                    this._log(['Request aborted']);
                } else {
                    this._log([`Error fetching data: ${error.message}`]);
                    if (error.stack) {
                        this._log(['Stack trace', error.stack]);
                    }

                    if (error.response) {
                        // The server responded with a status code outside the 2xx range
                        this._log([`Error status: ${error.response.status}`]);
                        this._log(['Error data:', JSON.stringify(error.response.data)]);

                        // Log the specific headers
                        this._log(['Error response headers:', error.response.headers]);
                    } else if (error.request) {
                        // The request was made but no response was received
                        this._log(['No response received for request:', error.request]);
                    }

                    handler(null);
                }
            })
            .finally(() => {
                this._cancelSignal = null;
            });
    }

    abort(): void {
        if (this._cancelSignal) {
            this._log(['Aborting previous request']);
            this._log(['Trace', new Error().stack!])
            this._cancelSignal.abort();
            this._cancelSignal = null;
        }
    }
}

export class CurlApiHandler implements ApiHandler {
    private _log: (logs: string[]) => void;
    private _currentProcesses: ChildProcess[] = [];

    constructor(log: (logs: string[]) => void) {
        this._log = log;
    }

    private _removeProcess(cp: ChildProcess) {
        this._currentProcesses = this._currentProcesses.filter(p => p != cp);
    }

    fetchJson(
        url: string,
        method: HttpMethods,
        headers: Map<string, string>,
        handler: (jsonData: any) => any
    ): void {
        this._log(['Fetching url', url]);
        const curlArgs: string[] = ['--silent', '--show-error', '-X', method, url];

        headers.forEach((value, key) => {
            curlArgs.push('-H', `${key}: ${value}`);
        });

        this._log(['Executing curl command with args:', JSON.stringify(curlArgs)]);

        const curlProcess = spawn('curl', curlArgs);
        this._currentProcesses.push(curlProcess);

        let rawData = '';
        let errorData = '';

        curlProcess.stdout.on('data', (chunk) => {
            rawData += chunk;
        });

        curlProcess.stderr.on('data', (chunk) => {
            errorData += chunk;
        });

        curlProcess.on('close', (code) => {
            this._removeProcess(curlProcess);

            if (code === 0) {
                try {
                    const jsonData = JSON.parse(rawData);
                    if (jsonData === null || (Array.isArray(jsonData) && jsonData.length === 0)) {
                        this._log(['Received empty data/invalid response']);
                        handler(null);
                    } else {
                        this._log(['Received response']);
                        handler(jsonData);
                    }
                } catch (e) {
                    this._log(['Error parsing JSON:', rawData]);
                    handler(null);
                }
            } else {
                this._log([`curl process exited with code ${code}`]);
                if (errorData) {
                    this._log(['curl stderr output:', errorData]);
                }
                handler(null);
            }
        });

        curlProcess.on('error', (err) => {
            this._removeProcess(curlProcess);
            this._log([`Failed to start curl process: ${err.message}`]);
            handler(null);
        });
    }

    abort(): void {
        this._currentProcesses.forEach(p => {
            this._log(['Aborting previous request by killing curl process']);
            p.kill();
        });

        this._currentProcesses.length = 0;
    }
}
