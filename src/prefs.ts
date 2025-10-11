// src/prefs.ts (Example)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences, getPreferencesWindow } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gio from 'gi://Gio';

const tourKeyMap = new Map([
    ['ATP', 'enable-atp'],
    ['WTA', 'enable-wta'],
    ['ATP Challenger', 'enable-atp-challenger'],
]);

export default class LiveScorePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window: Adw.PreferencesWindow) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        window.add(page);

        const tourGroup = new Adw.PreferencesGroup({
            title: 'Enable tours',
            description: 'Control which tours are enabled and processed.',
        });
        page.add(tourGroup);

        // Not using tourKeyMap so that we can maintain order of tours in settings
        ['ATP', 'WTA', 'ATP Challenger'].forEach(tour => {
            const row = new Adw.ActionRow({
                title: `Enable ${tour} tour`,
                subtitle: `Process events and matches from ${tour} Tour.`,
            });
            tourGroup.add(row);

            const tourCheckButton = new Gtk.CheckButton({
                halign: Gtk.Align.CENTER, // Prevent horizontal expansion
                valign: Gtk.Align.CENTER, // Prevent vertical expansion
            });
            row.add_suffix(tourCheckButton);

            settings.bind(tourKeyMap.get(tour), tourCheckButton, 'active', Gio.SettingsBindFlags.DEFAULT);
        });

        const completedGroup = new Adw.PreferencesGroup({
            title: 'Completed Matches',
            description: 'Control how long completed matches remain visible.'
        });
        page.add(completedGroup);

        const durationRow = new Adw.ActionRow({
            title: 'Keep for Duration',
            subtitle: 'Time in minutes to keep completed matches visible.'
        });
        completedGroup.add(durationRow);

        const durationSpinner = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 120, step_increment: 5
            }),
            valign: Gtk.Align.CENTER
        });
        durationRow.add_suffix(durationSpinner);
        durationRow.activatable_widget = durationSpinner;

        settings.bind('keep-completed-duration', durationSpinner, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}
