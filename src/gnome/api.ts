import Soup from "gi://Soup";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import { ApiHandler, ApiRequest } from "../common/api.js";

export class GnomeApiHandler implements ApiHandler {
    private _log: (logs: string[]) => void;
    private _httpSession: Soup.Session | undefined;

    constructor(log: (logs: string[]) => void) {
        this._log = log;
        this._httpSession = new Soup.Session();
        this._httpSession.timeout = 60000;
    }

    private _fetch(request: ApiRequest): Promise<[any, Map<string, string> | undefined]> {
        this._log(['Fetching url', request.url]);
        let msg = Soup.Message.new(request.method, request.url);

        if (request.headers) {
            request.headers.forEach((value, key) => msg.request_headers.append(key, value));
        }

        if (request.cookies) {
            const cookieString = Array.from(request.cookies.entries())
                .map(([key, value]) => `${key}=${value}`)
                .join('; ');
            msg.request_headers.append('Cookie', cookieString);
        }

        if (request.payload) {
            const payload = Array.from(request.payload.entries()).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`).join('&');
            const encoder = new TextEncoder();
            const payloadUint8Array = encoder.encode(payload);
            const bytes = new GLib.Bytes(payloadUint8Array);
            msg.set_request_body_from_bytes('application/x-www-form-urlencoded', bytes);
        }

        const cancellable = new Gio.Cancellable();

        return new Promise<[any, Map<string, string> | undefined]>((resolve) => {
            this._httpSession!.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, cancellable, (_, r) => {
                try {
                    const messageBody = this._httpSession!.send_and_read_finish(r);
                    const bytes = messageBody.get_data();
                    const status = msg.get_status();

                    if (bytes == null) {
                        this._log(['Invalid empty response']);
                        return resolve([undefined, undefined]);
                    }

                    const response = new TextDecoder('utf-8').decode(bytes);

                    if (status > 299) {
                        this._log(["Remote server error: ", status.toString(), response]);
                        return resolve([undefined, undefined]);
                    }

                    const responseCookies = new Map<string, string>();
                    if (request.responseCookies) {
                        const cookiesList = Soup.cookies_from_response(msg);

                        if (cookiesList) {
                            for (let i = 0; i < cookiesList.length; i++) {
                                const cookie = cookiesList[i] as Soup.Cookie;
                                if (request.responseCookies.includes(cookie.get_name())) {
                                    responseCookies.set(cookie.get_name(), cookie.get_value());
                                }
                            }
                        }
                    }

                    this._log(['Received response']);
                    resolve([response, responseCookies]);
                } catch (e) {
                    this._log([`Error fetching data: ${e}`]);
                    if (e instanceof Error && e.stack) {
                        this._log(['Stack trace', e.stack]);
                    }
                    resolve([undefined, undefined]);
                }
            });
        });
    }

    async fetchString(request: ApiRequest): Promise<[string, Map<string, string> | undefined]> {
        return this._fetch(request);
    }

    async fetchJson(request: ApiRequest): Promise<[any, Map<string, string> | undefined]> {
        const [response, responseCookies] = await this._fetch(request);
        if (!response) {
            return [undefined, responseCookies];
        }

        const jsonData = JSON.parse(response);
        if (jsonData.length === 0) {
            this._log(["Remote server error:", response]);
            return [undefined, responseCookies];
        }

        return [jsonData, responseCookies];
    }

    abort() {
        if (this._httpSession) {
            this._httpSession.abort();
        }
    }
};
