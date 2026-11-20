import test from 'node:test';
import assert from 'node:assert/strict';
import {SettingsManager} from '../src/settings/settingsManager.js';

class FakeSettings {
    constructor(values = {}) {
        this.values = {
            'refresh-interval': 1000,
            interface: 'auto',
            'display-mode': 'mini',
            'show-panel-indicator': true,
            'panel-indicator-mode': 'icon',
            'panel-indicator-refresh-interval': 1000,
            'panel-indicator-icon-theme': 'glass',
            'panel-indicator-custom-icon': '',
            'background-wallpaper': '',
            ...values,
        };
    }

    get_int(key) { return this.values[key]; }
    get_string(key) { return this.values[key]; }
    get_boolean(key) { return this.values[key]; }
    set_int(key, value) { this.values[key] = value; return true; }
    set_string(key, value) { this.values[key] = value; return true; }
}

test('panel indicator settings return safe defaults for invalid values', () => {
    const settings = new FakeSettings({'panel-indicator-mode': 'unknown'});
    const manager = new SettingsManager(settings);
    assert.equal(manager.showPanelIndicator, true);
    assert.equal(manager.panelIndicatorMode, 'icon');
    assert.equal(manager.panelIndicatorRefreshInterval, 1000);
    assert.equal(manager.panelIndicatorIconTheme, 'glass');
    assert.equal(manager.panelIndicatorCustomIcon, '');
});

test('panel indicator mode validation rejects unsupported values', () => {
    const settings = new FakeSettings();
    const manager = new SettingsManager(settings);
    assert.equal(manager.setString('panel-indicator-mode', 'combined'), true);
    assert.equal(manager.panelIndicatorMode, 'combined');
    assert.equal(manager.setString('panel-indicator-mode', 'unsupported'), false);
    assert.equal(manager.panelIndicatorMode, 'combined');
});

test('panel refresh interval is clamped and icon theme is validated', () => {
    const settings = new FakeSettings();
    const manager = new SettingsManager(settings);
    assert.equal(manager.setInt('panel-indicator-refresh-interval', 125), true);
    assert.equal(manager.panelIndicatorRefreshInterval, 250);
    assert.equal(manager.setString('panel-indicator-icon-theme', 'symbolic'), true);
    assert.equal(manager.panelIndicatorIconTheme, 'symbolic');
    assert.equal(manager.setString('panel-indicator-icon-theme', 'neon'), false);
});

test('custom panel SVG paths accept local SVGs and reject remote or non-SVG paths', () => {
    const settings = new FakeSettings();
    const manager = new SettingsManager(settings);
    assert.equal(manager.setString('panel-indicator-custom-icon', '~/Pictures/panel.svg'), true);
    assert.equal(manager.panelIndicatorCustomIcon, '~/Pictures/panel.svg');
    assert.equal(manager.setString('panel-indicator-custom-icon', 'https://example.com/icon.svg'), false);
    assert.equal(manager.setString('panel-indicator-custom-icon', '/tmp/icon.png'), false);
    assert.equal(manager.setString('panel-indicator-custom-icon', ''), true);
    assert.equal(manager.panelIndicatorCustomIcon, '');
});

test('background wallpaper accepts local raster paths and rejects remote resources', () => {
    const settings = new FakeSettings();
    const manager = new SettingsManager(settings);
    assert.equal(manager.backgroundWallpaper, '');
    assert.equal(manager.setString('background-wallpaper', '~/Pictures/forest.png'), true);
    assert.equal(manager.backgroundWallpaper, '~/Pictures/forest.png');
    assert.equal(manager.setString('background-wallpaper', '/tmp/wallpaper.webp'), true);
    assert.equal(manager.setString('background-wallpaper', 'https://example.com/bg.png'), false);
    assert.equal(manager.setString('background-wallpaper', '/tmp/bg.svg'), false);
    assert.equal(manager.setString('background-wallpaper', ''), true);
    assert.equal(manager.backgroundWallpaper, '');
});
