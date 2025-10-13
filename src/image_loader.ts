import St from 'gi://St';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

function _createIcon(imageBox: St.BoxLayout, cacheFilePath: string, imageSize: number) {
    const gicon = Gio.icon_new_for_string(cacheFilePath);

    imageBox.add_child(new St.Icon({
        gicon: gicon,
        height: imageSize,
    }));
}

async function loadImage(url: string, uuid: string,
    log: (logs: string[]) => void,
    handler: (cacheFilePath: string) => void): Promise<void> {
    const cacheDir = GLib.build_pathv('/', [GLib.get_user_cache_dir(), uuid]);

    if (!GLib.file_test(cacheDir, GLib.FileTest.IS_DIR)) {
        GLib.mkdir_with_parents(cacheDir, 0o755);
    }

    const checksum = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5, url, url.length);
    if (checksum === null) {
        logError(new Error('Failed to compute checksum for URL'), 'Image loader');
        return;
    }
    const urlHash: string = checksum;
    const cacheFilePath: string = GLib.build_filenamev([cacheDir, urlHash]);
    const cacheFile: Gio.File = Gio.File.new_for_path(cacheFilePath);

    try {
        if (cacheFile.query_exists(null)) {
            handler(cacheFilePath);
        } else {
            downloadImage(url, cacheFilePath).then((_: string) => {
                handler(cacheFilePath);
            }).catch(e => {
                log(['Error during image downloading: ' + e]);
            });
        }
    } catch (e) {
        log(['Error during image loading: ' + e]);
    }
}

export async function loadGicon(url: string, uuid: string, icon: St.Icon, log: (logs: string[]) => void): Promise<void> {
    loadImage(url, uuid, log, (cacheFilePath: string) => {
        icon.gicon = Gio.icon_new_for_string(cacheFilePath);
    });
}

export async function loadPopupMenuGicon(url: string, uuid: string, menuitem: PopupMenu.PopupSubMenuMenuItem, log: (logs: string[]) => void): Promise<void> {
    loadImage(url, uuid, log, (cacheFilePath: string) => {
        menuitem.icon.gicon = Gio.icon_new_for_string(cacheFilePath);
    });
}

export async function loadWebImage(url: string, uuid: string, imageBox: St.BoxLayout, imageSize: number, log: (logs: string[]) => void): Promise<void> {
    loadImage(url, uuid, log, (cacheFilePath: string) => _createIcon(imageBox, cacheFilePath, imageSize));
}

async function downloadImage(url: string, destinationPath: string): Promise<string> {
    const session = new Soup.Session();
    try {
        const message = Soup.Message.new('GET', url);

        const bytes = await session.send_and_read_async(message, 0, null);

        if (message.status_code !== Soup.Status.OK) {
            throw new Error(`Failed to download image. Status: ${message.status_code} - ${message.reason_phrase}`);
        }

        const file = Gio.File.new_for_path(destinationPath);

        await file.replace_contents_bytes_async(bytes, null, false, Gio.FileCreateFlags.NONE, null, null);

        return destinationPath;
    } finally {
        session.abort();
    }
}
