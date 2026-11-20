import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {isValidCustomSvgPath} from './src/ui/iconTheme.js';
import {isValidWallpaperPath} from './src/ui/wallpaperPath.js';
import {DEFAULT_WALLPAPER_PRESET, WALLPAPER_PRESETS, isValidWallpaperPreset} from './src/ui/wallpaperPresets.js';

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

// The preferences window follows the same material as the widget: square
// corners, one glowing orange accent, silver rims, and sliders whose trough is
// a groove and whose thumb is a lit, bevelled handle.
const PREFS_CSS = `
window, .background { border-radius: 0; }
preferencespage, preferencesgroup, .card, list, row, button, entry, spinbutton,
dropdown, popover, popover > contents, headerbar, switch, slider, scale {
  border-radius: 0;
}
scale trough {
  background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(0, 0, 0, 0.55);
  border-bottom-color: rgba(255, 255, 255, 0.16);
  border-radius: 0;
  min-height: 8px;
}
scale highlight {
  background-image: linear-gradient(to bottom, #ffc078, #c2590a);
  border: 1px solid rgba(0, 0, 0, 0.35);
  border-radius: 0;
}
scale slider {
  background-image: linear-gradient(to bottom, #ffffff, #b9c2cc);
  border: 1px solid rgba(0, 0, 0, 0.55);
  border-top-color: rgba(255, 255, 255, 0.85);
  border-radius: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.65), 0 0 6px rgba(255, 138, 31, 0.45);
  min-width: 12px;
  min-height: 18px;
}
button:focus, entry:focus, spinbutton:focus, row:focus {
  outline-color: #ff8a1f;
}
`;

function getInterfaceNames() {
    const names = [];
    let directory = null;
    try {
        directory = GLib.dir_open('/sys/class/net', 0);
        while (true) {
            const name = GLib.dir_read_name(directory);
            if (name === null)
                break;
            if (name !== 'lo' && /^[A-Za-z0-9_.:-]{1,15}$/.test(name))
                names.push(name);
        }
    } catch (_error) {
        // The automatic option remains available if sysfs cannot be read.
    } finally {
        if (directory !== null) {
            try { GLib.dir_close(directory); } catch (_error) { /* already closed */ }
        }
    }
    return names.sort();
}

function addSwitch(group, settings, key, title, subtitle) {
    const row = new Adw.SwitchRow({title, subtitle});
    group.add(row);
    settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
    return row;
}

function addCombo(group, title, subtitle, options, selectedValue, onSelected) {
    const model = Gtk.StringList.new(options.map(option => option.label));
    const selected = Math.max(0, options.findIndex(option => option.value === selectedValue));
    const row = new Adw.ComboRow({title, subtitle, model, selected});
    row.connect('notify::selected', () => {
        const option = options[row.selected];
        if (option)
            onSelected(option.value);
    });
    group.add(row);
    return row;
}

function addSpin(group, title, subtitle, value, lower, upper, onValue) {
    const row = Adw.SpinRow.new_with_range(lower, upper, 1);
    row.title = title;
    row.subtitle = subtitle;
    row.value = value;
    row.connect('notify::value', () => onValue(Math.round(row.value)));
    group.add(row);
    return row;
}

export default class UthySpeedGlassPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.search_enabled = false;
        window.default_width = 650;
        window.default_height = 760;

        try {
            const provider = new Gtk.CssProvider();
            provider.load_from_string(PREFS_CSS);
            Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
            this._cssProvider = provider;
        } catch (_error) {
            // The window keeps the platform theme if the CSS cannot be parsed.
        }

        // Show the bundled logo on the page: GTK looks it up by file name once
        // the extension's icon directory is on the icon theme search path.
        let pageIcon = 'network-transmit-receive-symbolic';
        try {
            const icons = this.dir.get_child('icons');
            Gtk.IconTheme.get_for_display(Gdk.Display.get_default()).add_search_path(icons.get_path());
            if (icons.get_child('brand.png').query_exists(null))
                pageIcon = 'brand';
        } catch (_error) {
            // Keep the themed icon if the directory cannot be registered.
        }

        const page = new Adw.PreferencesPage({title: 'UthyPing', icon_name: pageIcon});
        window.add(page);

        const general = new Adw.PreferencesGroup({title: 'Monitoring', description: 'Choose how traffic is sampled, which interface is measured, and how the widget is laid out.'});
        page.add(general);
        addCombo(general, 'Refresh interval', 'Sampling frequency for local interface counters.', [
            {label: '500 ms', value: 500}, {label: '1 second', value: 1000}, {label: '2 seconds', value: 2000},
        ], settings.get_int('refresh-interval'), value => settings.set_int('refresh-interval', value));

        const interfaceNames = ['auto', ...getInterfaceNames()];
        const currentInterface = settings.get_string('interface');
        const interfaceOptions = interfaceNames.map(name => ({
            label: name === 'auto' ? 'Automatic (active connection)' : name,
            value: name,
        }));
        const safeInterface = interfaceNames.includes(currentInterface) ? currentInterface : 'auto';
        addCombo(general, 'Network interface', 'Ethernet, Wi-Fi, USB tethering, and visible virtual interfaces.',
            interfaceOptions, safeInterface, value => settings.set_string('interface', value));

        const modeOptions = [
            {label: 'Mini', value: 'mini'}, {label: 'Compact', value: 'compact'}, {label: 'Expanded', value: 'expanded'},
        ];
        const selectedMode = modeOptions.some(option => option.value === settings.get_string('display-mode'))
            ? settings.get_string('display-mode') : 'mini';
        addCombo(general, 'Display mode', 'Mini shows essential readings; Compact adds detail; Expanded shows the graph and full statistics.', modeOptions,
            selectedMode, value => settings.set_string('display-mode', value));

        const panel = new Adw.PreferencesGroup({
            title: 'Panel indicator',
            description: 'Choose whether UthyPing appears in the GNOME top panel and what it displays.',
        });
        page.add(panel);
        const showPanelRow = addSwitch(panel, settings, 'show-panel-indicator',
            'Show panel indicator', 'Keep a live UthyPing entry in the GNOME top panel.');
        const panelModeOptions = [
            {label: 'Icon only', value: 'icon'},
            {label: 'Download speed', value: 'download'},
            {label: 'Upload speed', value: 'upload'},
            {label: 'Download and upload speeds', value: 'combined'},
            {label: 'Connection status', value: 'status'},
        ];
        const configuredPanelMode = settings.get_string('panel-indicator-mode');
        const selectedPanelMode = panelModeOptions.some(option => option.value === configuredPanelMode)
            ? configuredPanelMode : 'icon';
        const panelModeRow = addCombo(panel, 'Panel indicator content',
            'Select the live value shown beside the UthyPing panel icon.', panelModeOptions,
            selectedPanelMode, value => settings.set_string('panel-indicator-mode', value));
        panelModeRow.set_sensitive(showPanelRow.active);
        showPanelRow.connect('notify::active', () => panelModeRow.set_sensitive(showPanelRow.active));
        addSpin(panel, 'Panel refresh interval',
            'How often the panel reading is redrawn; monitor sampling remains independent.',
            settings.get_int('panel-indicator-refresh-interval'), 250, 5000,
            value => settings.set_int('panel-indicator-refresh-interval', value));
        const iconThemeOptions = [
            {label: 'Liquid glass', value: 'glass'},
            {label: 'Network badge', value: 'network'},
            {label: 'System symbolic', value: 'symbolic'},
        ];
        const configuredIconTheme = settings.get_string('panel-indicator-icon-theme');
        const selectedIconTheme = iconThemeOptions.some(option => option.value === configuredIconTheme)
            ? configuredIconTheme : 'glass';
        addCombo(panel, 'Panel icon theme',
            'Choose the icon treatment used by the panel entry.', iconThemeOptions,
            selectedIconTheme, value => settings.set_string('panel-indicator-icon-theme', value));
        this._addCustomIconRow(panel, settings);

        const appearance = new Adw.PreferencesGroup({title: 'Appearance', description: 'Tune the liquid-glass surface, colors, and graph.'});
        page.add(appearance);
        addSpin(appearance, 'Surface opacity', 'Higher values make the glass surface less transparent.',
            settings.get_int('transparency'), 45, 96, value => settings.set_int('transparency', value));
        const wallpaperOptions = WALLPAPER_PRESETS.map(preset => ({
            label: preset.label,
            value: preset.key,
        }));
        const configuredWallpaperPreset = settings.get_string('background-wallpaper-preset');
        const selectedWallpaperPreset = isValidWallpaperPreset(configuredWallpaperPreset)
            ? configuredWallpaperPreset : DEFAULT_WALLPAPER_PRESET;
        addCombo(appearance, 'Background wallpaper',
            'Choose a bundled cinematic wallpaper or switch to a custom local image.',
            wallpaperOptions, selectedWallpaperPreset,
            value => settings.set_string('background-wallpaper-preset', value));
        this._addWallpaperRow(appearance, settings);
        addSpin(appearance, 'Font size', 'Widget text size in logical pixels.',
            settings.get_int('font-size'), 10, 22, value => settings.set_int('font-size', value));
        addSpin(appearance, 'Graph height', 'Expanded graph height in logical pixels.',
            settings.get_int('graph-height'), 24, 100, value => settings.set_int('graph-height', value));
        const speedUnitOptions = [
            {label: 'Bits per second', value: 'bits'},
            {label: 'Bytes per second', value: 'bytes'},
            {label: 'Kilobytes per second', value: 'kilobytes'},
            {label: 'Megabytes per second', value: 'megabytes'},
        ];
        const configuredSpeedUnit = settings.get_string('speed-unit');
        const selectedSpeedUnit = speedUnitOptions.some(option => option.value === configuredSpeedUnit)
            ? configuredSpeedUnit : 'bytes';
        addCombo(appearance, 'Speed unit', 'Choose how download and upload rates are displayed throughout UthyPing.',
            speedUnitOptions, selectedSpeedUnit, value => settings.set_string('speed-unit', value));

        this._addColorRow(appearance, settings, 'download-color', 'Download accent color', '#FF8A1F');
        this._addColorRow(appearance, settings, 'upload-color', 'Upload accent color', '#6E96BC');
        addSwitch(appearance, settings, 'show-graphs', 'Show history graphs', 'Draw recent download and upload traffic.');

        const behavior = new Adw.PreferencesGroup({title: 'Behavior', description: 'Control placement, motion, and optional local latency checks.'});
        page.add(behavior);
        addSwitch(behavior, settings, 'remember-position', 'Remember position and size', 'Keep the widget geometry between sessions.');
        addSwitch(behavior, settings, 'reduce-motion', 'Reduce motion', 'Disable animated speed meter transitions.');
        addSwitch(behavior, settings, 'ping-enabled', 'Measure local gateway ping', 'Optional: sends one ICMP echo to your current IPv4 default gateway every 10 seconds. IPv6-only gateway discovery is not supported. No ping target is contacted while this is off.');

    }

    _addColorRow(group, settings, key, title, fallback) {
        const row = new Adw.EntryRow({title});
        const current = settings.get_string(key);
        row.text = COLOR_PATTERN.test(current) ? current : fallback;
        row.connect('changed', () => {
            if (COLOR_PATTERN.test(row.text))
                settings.set_string(key, row.text.toUpperCase());
        });
        group.add(row);
    }

    _addCustomIconRow(group, settings) {
        const row = new Adw.EntryRow({
            title: 'Custom SVG icon path',
            subtitle: 'Optional absolute path or ~/ path to a local .svg file. Leave blank to use the selected theme.',
        });
        const current = settings.get_string('panel-indicator-custom-icon');
        row.text = isValidCustomSvgPath(current) ? current : '';
        row.connect('changed', () => {
            const value = row.text.trim();
            if (isValidCustomSvgPath(value))
                settings.set_string('panel-indicator-custom-icon', value);
        });
        group.add(row);
    }

    _addWallpaperRow(group, settings) {
        const row = new Adw.EntryRow({
            title: 'Background wallpaper',
            subtitle: 'Optional local PNG, JPG, or WebP path. Leave blank to use the bundled forest wallpaper.',
        });
        row.text = settings.get_string('background-wallpaper');
        row.connect('changed', () => {
            const value = row.text.trim();
            if (!value) {
                settings.set_string('background-wallpaper', value);
                settings.set_string('background-wallpaper-preset', DEFAULT_WALLPAPER_PRESET);
            } else if (isValidWallpaperPath(value)) {
                settings.set_string('background-wallpaper', value);
                settings.set_string('background-wallpaper-preset', 'custom');
            }
        });
        group.add(row);
    }
}
