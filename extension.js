import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {SettingsManager} from './src/settings/settingsManager.js';
import {NetworkMonitor} from './src/network/networkMonitor.js';
import {WidgetController} from './src/ui/widgetController.js';
import {PanelIndicator} from './src/ui/panelIndicator.js';

export default class UthySpeedGlassExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._settingsManager = new SettingsManager(this._settings);
        this._theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        this._stylesheet = this.dir.get_child('stylesheet.css');
        this._theme.load_stylesheet(this._stylesheet);

        let controller = null;
        this._monitor = new NetworkMonitor(this._settingsManager, data => {
            controller?.update(data);
            this._panelIndicator?.update(data);
        });
        this._controller = new WidgetController(this, this._settingsManager, this._monitor);
        controller = this._controller;

        this._syncPanelIndicator();
        this._settingsChangedId = this._settings.connect('changed', (_settings, key) => {
            if (['refresh-interval', 'interface', 'ping-enabled'].includes(key))
                this._monitor.configure();
            this._controller.applySettings(key);
            if (key === 'show-panel-indicator' || key === 'panel-indicator-mode' ||
                key === 'panel-indicator-refresh-interval' || key === 'panel-indicator-icon-theme' ||
                key === 'panel-indicator-custom-icon' || key === 'speed-unit')
                this._syncPanelIndicator();
            this._syncPanelMenu();
        });
        this._monitor.start();
    }

    disable() {
        if (this._settingsChangedId && this._settings) {
            try {
                this._settings.disconnect(this._settingsChangedId);
            } catch (_error) {
                // The settings object may already be shutting down.
            }
            this._settingsChangedId = 0;
        }

        this._monitor?.destroy();
        this._monitor = null;
        this._controller?.destroy();
        this._controller = null;
        this._panelIndicator?.destroy();
        this._panelIndicator = null;
        this._settingsManager = null;
        this._settings = null;
        this._theme?.unload_stylesheet(this._stylesheet);
        this._theme = null;
        this._stylesheet = null;
    }

    _syncPanelIndicator() {
        if (!this._settingsManager?.showPanelIndicator) {
            this._panelIndicator?.destroy();
            this._panelIndicator = null;
            return;
        }

        if (!this._panelIndicator) {
            this._panelIndicator = new PanelIndicator({
                uuid: this.uuid,
                name: this.metadata.name,
                controller: this._controller,
                monitor: this._monitor,
                settingsManager: this._settingsManager,
                openPreferences: () => this.openPreferences(),
            });
            this._panelIndicator.create();
        } else {
            this._panelIndicator.setMode(this._settingsManager.panelIndicatorMode);
            this._panelIndicator.setRefreshInterval(this._settingsManager.panelIndicatorRefreshInterval);
            this._panelIndicator.setIconTheme(this._settingsManager.panelIndicatorIconTheme);
            this._panelIndicator.setCustomIcon(this._settingsManager.panelIndicatorCustomIcon);
            this._panelIndicator.setSpeedUnit(this._settingsManager.speedUnit);
        }
    }

    _syncPanelMenu() {
        // PanelIndicator owns its menu labels and keeps the panel actor stable.
    }
}
