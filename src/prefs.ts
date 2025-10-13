// src/prefs.ts (Example)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GdkPixbuf from 'gi://GdkPixbuf';
import { ExtensionPreferences, getPreferencesWindow } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { Countries } from './countries';
import GObject from 'gi://GObject';

const CountryItem = GObject.registerClass({
    GTypeName: 'CountryItem',
    Properties: {
        'name': GObject.ParamSpec.string('name', 'name', 'Country Name', GObject.ParamFlags.READWRITE, null),
        'ioc': GObject.ParamSpec.string('ioc', 'ioc', 'IOC Code', GObject.ParamFlags.READWRITE, null),
        'flag': GObject.ParamSpec.object('flag', 'flag', 'Flag Pixbuf', GObject.ParamFlags.READWRITE, GdkPixbuf.Pixbuf),
        'selected': GObject.ParamSpec.boolean('selected', 'selected', 'Selection State', GObject.ParamFlags.READWRITE, false),
    },
}, class CountryItem extends GObject.Object { });

const factory = new Gtk.SignalListItemFactory();
factory.connect('setup', (factory, listItem) => {
    const box = new Gtk.Box({
        spacing: 6,
        orientation: Gtk.Orientation.HORIZONTAL,
        homogeneous: false,
    });
    const flagImage = new Gtk.Image();
    const label = new Gtk.Label({ xalign: 0 });
    box.append(flagImage);
    box.append(label);
    listItem.set_child(box);
});
factory.connect('bind', (factory, listItem) => {
    const countryItem = listItem.get_item();
    const box = listItem.get_child();
    const flagImage = box.get_first_child();
    const label = flagImage.get_next_sibling();

    flagImage.set_from_pixbuf(countryItem.flag);
    label.set_text(countryItem.name);
});

export default class LiveScorePreferences extends ExtensionPreferences {
    private _settings: Gio.Settings;
    private _schema: Gio.SettingsSchema;

    constructor(metadata: any) {
        super(metadata);
        this._settings = this.getSettings();
        const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
            this.path + '/schemas',
            Gio.SettingsSchemaSource.get_default(),
            false
        );
        this._schema = schemaSource?.lookup('org.gnome.shell.extensions.live-tennis', true)!;
    }

    private _addCheckBoxSettingRow(group: Adw.PreferencesGroup, key: string) {
        const keyObject = this._schema.get_key(key);
        const row = new Adw.ActionRow({
            title: keyObject.get_summary()!,
            subtitle: keyObject.get_description()!,
        });
        group.add(row);

        const checkButton = new Gtk.CheckButton({
            halign: Gtk.Align.CENTER, // Prevent horizontal expansion
            valign: Gtk.Align.CENTER, // Prevent vertical expansion
        });
        row.add_suffix(checkButton);

        this._settings.bind(key, checkButton, 'active', Gio.SettingsBindFlags.DEFAULT);
    }

    private _addIntBasedEntry(group: Adw.PreferencesGroup, key: string) {
        const keyObject = this._schema.get_key(key);

        const entryRow = new Adw.EntryRow({
            title: keyObject.get_summary()!,
            text: String(this._settings.get_int(key)),
        });
        entryRow.set_tooltip_text(keyObject.get_description());
        group.add(entryRow);

        const errorIcon = new Gtk.Image({
            icon_name: 'dialog-error-symbolic',
            visible: false,
        });
        entryRow.add_suffix(errorIcon);

        const rangeVariant = keyObject.get_range();
        const innerRangeVariant = rangeVariant.get_child_value(1).get_variant();

        const [minValue, maxValue] = innerRangeVariant.deep_unpack();

        entryRow.connect('changed', () => {
            const text = entryRow.get_text();
            const value = parseInt(text, 10);

            console.log('Inside changed');

            if (!isNaN(value) && value >= minValue && value <= maxValue) {
                this._settings.set_int(key, value);
                entryRow.remove_css_class('error-input');
                errorIcon.set_visible(false);
            } else {
                entryRow.add_css_class('error-input');
                errorIcon.set_visible(true);
            }
        });
    }

    private _addSpinBoxSettingRow(group: Adw.PreferencesGroup, key: string, min: number, max: number, increment: number=5) {
        const keyObject = this._schema.get_key(key);

        const durationRow = new Adw.ActionRow({
            title: keyObject.get_summary()!,
            subtitle: keyObject.get_description()!,
        });
        group.add(durationRow);

        const spinner = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: min, upper: max, step_increment: increment
            }),
            valign: Gtk.Align.CENTER
        });
        durationRow.add_suffix(spinner);
        durationRow.activatable_widget = spinner;

        this._settings.bind(key, spinner, 'value', Gio.SettingsBindFlags.DEFAULT);

    }

    private _addTourSettings(page: Adw.PreferencesPage) {
        const tourGroup = new Adw.PreferencesGroup({
            title: 'Enable tours',
            description: 'Control which tours are enabled and processed.',
        });
        page.add(tourGroup);

        this._addCheckBoxSettingRow(tourGroup, 'enable-atp'!);
        this._addCheckBoxSettingRow(tourGroup, 'enable-wta');
        this._addCheckBoxSettingRow(tourGroup, 'enable-atp-challenger');
    }

    private _addLiveViewSettings(page: Adw.PreferencesPage) {
        const liveViewGroup = new Adw.PreferencesGroup({
            title: 'Live Score Window',
            description: 'Control Live Score Window behaviour',
        });
        page.add(liveViewGroup);

        this._addIntBasedEntry(liveViewGroup, 'live-window-size-x');
        this._addIntBasedEntry(liveViewGroup, 'live-window-size-y');
        this._addCheckBoxSettingRow(liveViewGroup, 'auto-hide-no-live-matches');
        this._addCheckBoxSettingRow(liveViewGroup, 'only-show-live-matches');
    }

    private _addMultiCountrySelection(group: Adw.PreferencesGroup, key: string) {
        const keyObject = this._schema.get_key(key);

        const selectedCodes = new Set(this._settings.get_strv(key));
        const model = new Gio.ListStore({ item_type: CountryItem.$gtype });

        // Populate the model
        Countries.forEach(country => {
            try {
                const flagPath = this.path + `/flags/${country.ioc.toLowerCase()}.svg`;
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(flagPath, 24, 18, true);
                const isSelected = selectedCodes.has(country.ioc);
                model.append(new CountryItem({ ...country, flag: pixbuf, selected: isSelected }));
            } catch (e) {
                console.error(`Failed to load flag for ${country.name}: ${e.message}`);
                const isSelected = selectedCodes.has(country.ioc);
                model.append(new CountryItem({ ...country, flag: null, selected: isSelected }));
            }
        });

        // Setup the list item factory
        const factory = new Gtk.SignalListItemFactory();
        factory.connect('setup', (f, listItem) => {
            const check = new Gtk.CheckButton({
                halign: Gtk.Align.END,
            });
            const box = new Gtk.Box({ spacing: 6, orientation: Gtk.Orientation.HORIZONTAL, homogeneous: false });
            const flagImage = new Gtk.Image();
            const label = new Gtk.Label({ xalign: 0, hexpand: true });
            box.append(check);
            box.append(flagImage);
            box.append(label);
            listItem.set_child(box);
        });
        factory.connect('bind', (f, listItem) => {
            const countryItem = listItem.get_item();
            const box = listItem.get_child();
            const check = box.get_first_child();
            const flagImage = check.get_next_sibling();
            const label = flagImage.get_next_sibling();

            check.set_active(countryItem.selected);
            check.connect('toggled', () => {
                countryItem.selected = check.get_active();
                const selectedCodes = [];
                for (let i = 0; i < model.get_n_items(); i++) {
                    const item = model.get_item(i);
                    if (item.selected) {
                        selectedCodes.push(item.ioc);
                    }
                }
                this._settings.set_strv(key, selectedCodes);
            });

            if (countryItem.flag) {
                flagImage.set_from_pixbuf(countryItem.flag);
            }
            label.set_text(countryItem.name);
        });

        const listView = new Gtk.ListView({
            model: Gtk.NoSelection.new(model), // Use NoSelection since we handle it manually
            factory: factory,
        });

        // Add the list to a scrollable window
        const scrollView = new Gtk.ScrolledWindow({
            height_request: 300,
            hexpand: true,
            vexpand: true,
        });
        scrollView.set_child(listView);

        const row = new Adw.ActionRow({
            title: keyObject.get_summary()!,
            subtitle: keyObject.get_description()!,
        });
        row.add_suffix(scrollView);
        group.add(row);
    }


    private _addPlayerNamesEntry(group: Adw.PreferencesGroup, key: string) {
        const keyObject = this._schema.get_key(key);

        const currentNames = this._settings.get_strv(key).join(', ');

        const entryRow = new Adw.EntryRow({
            title: keyObject.get_summary()!,
            text: currentNames,
        });
        entryRow.set_tooltip_text(keyObject.get_description());
        group.add(entryRow);

        const errorIcon = new Gtk.Image({
            icon_name: 'dialog-error-symbolic',
            visible: false,
        });
        entryRow.add_suffix(errorIcon);

        const regex = /^([a-zA-Z]+(,\s*[a-zA-Z]+)*)?$/;

        entryRow.connect('changed', () => {
            const text = entryRow.get_text();

            if (text === '' || regex.test(text.trim())) {
                const names = text.split(',').map(s => s.trim()).filter(Boolean);
                this._settings.set_strv(key, names);
                entryRow.remove_css_class('error-input');
                errorIcon.set_visible(false);
            } else {
                entryRow.add_css_class('error-input');
                errorIcon.set_visible(true);
            }
        });
    }

    private _addAutoSelectSettings(page: Adw.PreferencesPage) {
        const group = new Adw.PreferencesGroup({
            title: 'Live View Match Selection',
            description: 'Control how Live View match selection works.'
        });
        page.add(group);

        this._addCheckBoxSettingRow(group, 'auto-select-live-matches');
        this._addMultiCountrySelection(group, 'auto-select-country-codes');
        this._addPlayerNamesEntry(group, 'auto-select-player-names');
        this._addSpinBoxSettingRow(group, 'keep-completed-duration', 0, 120);
    }

    fillPreferencesWindow(window: Adw.PreferencesWindow) {
        const page = new Adw.PreferencesPage();
        window.add(page);
        this._addTourSettings(page);
        this._addLiveViewSettings(page);
        this._addAutoSelectSettings(page);
    }
}
