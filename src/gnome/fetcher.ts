import { TTFetcher } from "../common/tt_fetcher";
import GLib from "gi://GLib";

export class GnomeTTFetcher extends TTFetcher {
    protected getFullUrl(relativeUrl: string, baseUrl: string): string {
        try {
            return GLib.Uri.resolve_relative(baseUrl, relativeUrl, GLib.UriFlags.NONE);
        } catch (e) {
            console.log("Failed to resolve URI with GLib");
            return '';
        }
    }
}
