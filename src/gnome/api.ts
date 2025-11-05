import Soup from "gi://Soup";
import GLib from "gi://GLib";
import { ApiHandler, HttpMethods } from "../common/api.js";

export class GnomeApiHandler implements ApiHandler {
    private _log: (logs: string[]) => void;
    private _httpSessionUsageCount: number;
    private _httpSession: Soup.Session | undefined;

    constructor(log: (logs: string[]) => void) {
        this._log = log;
        this._httpSessionUsageCount = 0;
        this._httpSession = undefined;
    }

    fetchJson(url: string, method: HttpMethods, headers: Map<string, string>, handler: (jsonData: any) => any): void {
        this._log(['Fetching url', url]);
        let msg = Soup.Message.new(method, url);
        headers.forEach((value, key) => msg.request_headers.append(key, value));

        if (!this._httpSession) {
            this._httpSessionUsageCount = 1;
            this._httpSession = new Soup.Session();
            this._httpSession.timeout = 60000;
        } else {
            this._httpSessionUsageCount -= 1;
        }

        this._httpSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (_, r) => {
            try {
                const bytes = this._httpSession!.send_and_read_finish(r).get_data();
                if (this._httpSessionUsageCount == 1) {
                    this._httpSession = undefined;
                }
                this._httpSessionUsageCount -= 1;

                if (bytes == null) {
                    this._log(['Invalid empty response']);
                    return handler(null);
                }
                const response = new TextDecoder('utf-8').decode(bytes);
                if (msg.get_status() > 299) {
                    this._log(["Remote server error: ", msg.get_status().toString(), response]);
                    return handler(null);
                }
                const jsonData = JSON.parse(response);
                if (jsonData.length === 0) {
                    this._log(["Remote server error:", response]);
                    return handler(null);
                }

                this._log(['Received response']);
                handler(jsonData);
            } catch (e) {
                this._log([`Error fetching data: ${e}`]);
                if (e instanceof Error && e.stack) {
                    this._log(['Stack trace', e.stack]);
                }
                handler(null);
            }
        });
    }

    abort() {
        if (this._httpSession) {
            this._httpSession.abort();
            this._httpSessionUsageCount = 0;
            this._httpSession = undefined;
        }
    }
};
