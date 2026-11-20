import {INTERFACE_NAME_PATTERN} from '../network/trafficReader.js';
import {isValidCustomSvgPath, VALID_PANEL_ICON_THEMES} from '../ui/iconTheme.js';
import {isValidWallpaperPath} from '../ui/wallpaperPath.js';
import {DEFAULT_WALLPAPER_PRESET, isValidWallpaperPreset} from '../ui/wallpaperPresets.js';

const VALID_REFRESH_INTERVALS = [500, 1000, 2000];
const VALID_MODES = ['mini', 'compact', 'expanded'];
const VALID_PANEL_INDICATOR_MODES = ['icon', 'download', 'upload', 'combined', 'status'];
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export class SettingsManager {
    constructor(settings) {
        this.settings = settings;
    }

    get refreshInterval() {
        const value = this.settings.get_int('refresh-interval');
        return VALID_REFRESH_INTERVALS.includes(value) ? value : 1000;
    }

    get interfaceName() {
        const value = this.settings.get_string('interface');
        return value === 'auto' || INTERFACE_NAME_PATTERN.test(value) ? value : 'auto';
    }

    get displayMode() {
        const value = this.settings.get_string('display-mode');
        return VALID_MODES.includes(value) ? value : 'mini';
    }

    get showPanelIndicator() {
        return this.settings.get_boolean('show-panel-indicator');
    }

    get panelIndicatorMode() {
        const value = this.settings.get_string('panel-indicator-mode');
        return VALID_PANEL_INDICATOR_MODES.includes(value) ? value : 'icon';
    }

    get panelIndicatorRefreshInterval() {
        const value = this.settings.get_int('panel-indicator-refresh-interval');
        return Number.isInteger(value) && value >= 250 && value <= 5000 ? value : 1000;
    }

    get panelIndicatorIconTheme() {
        const value = this.settings.get_string('panel-indicator-icon-theme');
        return VALID_PANEL_ICON_THEMES.includes(value) ? value : 'glass';
    }

    get panelIndicatorCustomIcon() {
        const value = this.settings.get_string('panel-indicator-custom-icon');
        return isValidCustomSvgPath(value) ? value.trim() : '';
    }

    get downloadColor() {
        return this._readColor('download-color', '#FF8A1F');
    }

    get uploadColor() {
        return this._readColor('upload-color', '#6E96BC');
    }

    get backgroundWallpaper() {
        const value = this.settings.get_string('background-wallpaper');
        return isValidWallpaperPath(value) ? value.trim() : '';
    }

    get backgroundWallpaperPreset() {
        const value = this.settings.get_string('background-wallpaper-preset');
        return isValidWallpaperPreset(value) ? value : DEFAULT_WALLPAPER_PRESET;
    }

    get(key) {
        return this.settings.get_value(key).deep_unpack();
    }

    setInt(key, value) {
        const ranges = {
            'refresh-interval': [500, 2000], 'widget-x': [-10000, 10000],
            'widget-y': [-10000, 10000], 'widget-width': [240, 1000],
            'widget-height': [70, 700], 'transparency': [45, 96],
            'font-size': [10, 22], 'graph-height': [24, 100],
            'panel-indicator-refresh-interval': [250, 5000],
        };
        const range = ranges[key];
        if (!range || !Number.isFinite(value))
            return false;
        return this.settings.set_int(key, Math.max(range[0], Math.min(range[1], Math.round(value))));
    }

    setString(key, value) {
        if (key === 'interface' && value !== 'auto' && !INTERFACE_NAME_PATTERN.test(value))
            return false;
        if (key === 'display-mode' && !VALID_MODES.includes(value))
            return false;
        if (key === 'panel-indicator-mode' && !VALID_PANEL_INDICATOR_MODES.includes(value))
            return false;
        if (key === 'panel-indicator-icon-theme' && !VALID_PANEL_ICON_THEMES.includes(value))
            return false;
        if (key === 'panel-indicator-custom-icon' &&
            (typeof value !== 'string' || !isValidCustomSvgPath(value.trim())))
            return false;
        if (key === 'background-wallpaper' &&
            (typeof value !== 'string' || (value.trim() !== '' && !isValidWallpaperPath(value.trim()))))
            return false;
        if (key === 'background-wallpaper-preset' && !isValidWallpaperPreset(value))
            return false;
        if ((key === 'download-color' || key === 'upload-color') && !COLOR_PATTERN.test(value))
            return false;
        return this.settings.set_string(key, value);
    }

    _readColor(key, fallback) {
        const value = this.settings.get_string(key);
        return COLOR_PATTERN.test(value) ? value : fallback;
    }
}

export {VALID_MODES, VALID_PANEL_INDICATOR_MODES, VALID_PANEL_ICON_THEMES};
