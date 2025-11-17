import { TTFetcher } from "../common/tt_fetcher.js";

export class ElectronTTFetcher extends TTFetcher {
    protected getFullUrl(relativeUrl: string, baseUrl: string): string {
        try {
            const absoluteUrl = new URL(relativeUrl, baseUrl);
            return absoluteUrl.toString();
        } catch (e) {
            console.log("Failed to resolve URI with GLib");
            return '';
        }
    }
}
