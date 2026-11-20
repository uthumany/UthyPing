import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {formatPanelRate} from '../network/speedCalculator.js';

const MODE_LABELS = {
    icon: 'Icon only',
    download: 'Download speed',
    upload: 'Upload speed',
    combined: 'Download and upload speeds',
    status: 'Connection status',
};
const ICON_THEMES = ['glass', 'network', 'symbolic'];

export class PanelIndicator {
    constructor({uuid, name, controller, monitor, settingsManager, openPreferences}) {
        this._uuid = uuid;
        this._name = name;
        this._controller = controller;
        this._monitor = monitor;
        this._settings = settingsManager;
        this._openPreferences = openPreferences;
        this._button = null;
        this._content = null;
        this._data = null;
        this._mode = 'icon';
        this._showItem = null;
        this._pauseItem = null;
        this._downloadLabel = null;
        this._uploadLabel = null;
        this._statusLabel = null;
        this._iconTheme = 'glass';
        this._customIcon = '';
        this._refreshInterval = 1000;
        this._speedUnit = 'bytes';
        this._lastRenderAt = 0;
    }

    create() {
        if (this._button)
            return;

        this._button = new PanelMenu.Button(0.0, this._name, false);
        this._button.style_class = 'panel-button uthy-panel-indicator';
        this._button.set_accessible_name('UthyPing network monitor');
        Main.panel.addToStatusArea(this._uuid, this._button);

        this._showItem = new PopupMenu.PopupMenuItem('Show widget');
        this._showItem.connect('activate', () => {
            this._controller.setVisible(!this._controller.actor.visible);
            this._syncMenu();
        });
        this._button.menu.addMenuItem(this._showItem);

        this._pauseItem = new PopupMenu.PopupMenuItem('Pause monitoring');
        this._pauseItem.connect('activate', () => {
            if (this._monitor.paused)
                this._monitor.resume();
            else
                this._monitor.pause();
            this._syncMenu();
        });
        this._button.menu.addMenuItem(this._pauseItem);
        this._button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._button.menu.addAction('Reset session statistics', () => this._monitor.resetStatistics());
        this._button.menu.addAction('Preferences', () => this._openPreferences());

        this._iconTheme = this._settings.panelIndicatorIconTheme;
        this._customIcon = this._settings.panelIndicatorCustomIcon;
        this._refreshInterval = this._settings.panelIndicatorRefreshInterval;
        this._speedUnit = this._settings.speedUnit;
        this._setMode(this._settings.panelIndicatorMode);
        this._syncMenu();
    }

    destroy() {
        if (!this._button)
            return;
        this._button.destroy();
        this._button = null;
        this._content = null;
        this._showItem = null;
        this._pauseItem = null;
        this._data = null;
        this._downloadLabel = null;
        this._uploadLabel = null;
        this._statusLabel = null;
    }

    setMode(mode) {
        if (!MODE_LABELS[mode])
            mode = 'icon';
        if (mode === this._mode && this._content)
            return;
        this._setMode(mode);
    }

    update(data) {
        this._data = data;
        if (!this._button)
            return;
        const now = Date.now();
        if (this._lastRenderAt && now - this._lastRenderAt < this._refreshInterval)
            return;
        this._render(now);
        this._syncMenu();
    }

    setRefreshInterval(interval) {
        if (!Number.isFinite(interval))
            return;
        this._refreshInterval = Math.max(250, Math.min(5000, Math.round(interval)));
    }

    setSpeedUnit(speedUnit) {
        if (typeof speedUnit !== 'string' || speedUnit === this._speedUnit)
            return;
        this._speedUnit = speedUnit;
        if (this._data)
            this._render();
    }

    setIconTheme(theme) {
        if (!ICON_THEMES.includes(theme) || theme === this._iconTheme)
            return;
        this._iconTheme = theme;
        if (this._button)
            this._setMode(this._mode);
    }

    setCustomIcon(path) {
        const customIcon = typeof path === 'string' ? path : '';
        if (customIcon === this._customIcon)
            return;
        this._customIcon = customIcon;
        if (this._button)
            this._setMode(this._mode);
    }

    _setMode(mode) {
        this._mode = mode;
        if (!this._button)
            return;
        this._content?.destroy();
        this._content = new St.BoxLayout({
            style_class: `uthy-panel-indicator uthy-panel-indicator-${mode} uthy-panel-icon-theme-${this._iconTheme}`,
            reactive: false,
        });
        this._button.add_child(this._content);
        this._downloadLabel = null;
        this._uploadLabel = null;
        this._statusLabel = null;
        if (mode === 'icon')
            this._content.add_child(this._createIcon('notification'));
        else if (mode === 'status') {
            this._statusLabel = this._createLabel('', 'uthy-panel-status');
            this._content.add_child(this._statusLabel);
        } else {
            if (mode === 'download' || mode === 'combined')
                this._content.add_child(this._createRate('download', '↓'));
            if (mode === 'upload' || mode === 'combined')
                this._content.add_child(this._createRate('upload', '↑'));
        }
        this._render();
    }

    _render(now = Date.now()) {
        if (!this._content)
            return;
        this._lastRenderAt = now;

        const data = this._data ?? {};
        const download = formatPanelRate(data.downloadMBps, this._speedUnit);
        const upload = formatPanelRate(data.uploadMBps, this._speedUnit);
        const interfaceName = data.interfaceName ?? '—';
        const connected = data.state === 'CONNECTED' && data.interfaceName;
        const status = connected ? `● ${interfaceName}` : '○ Disconnected';

        if (this._mode === 'icon') {
            this._setAccessibleName('UthyPing network monitor');
            return;
        }

        if (this._mode === 'status') {
            this._statusLabel.set_text(status);
            this._setAccessibleName(connected
                ? `UthyPing connected on ${interfaceName}`
                : 'UthyPing disconnected');
            return;
        }

        if (this._downloadLabel)
            this._downloadLabel.set_text(download);
        if (this._uploadLabel)
            this._uploadLabel.set_text(upload);

        const accessible = this._mode === 'download'
            ? `UthyPing download ${download}`
            : this._mode === 'upload'
                ? `UthyPing upload ${upload}`
                : `UthyPing download ${download}, upload ${upload}`;
        this._setAccessibleName(accessible);
    }

    _createRate(kind, arrow) {
        const box = new St.BoxLayout({style_class: `uthy-panel-rate uthy-panel-rate-${kind}`});
        box.add_child(this._createLabel(arrow, 'uthy-panel-rate-arrow'));
        const value = this._createLabel('—', 'uthy-panel-rate-value');
        if (kind === 'download')
            this._downloadLabel = value;
        else
            this._uploadLabel = value;
        box.add_child(value);
        return box;
    }

    _createIcon(iconName) {
        if (this._customIcon)
            return this._controller.createIcon({
                iconName,
                iconSize: 16,
                styleClass: 'uthy-panel-icon',
                customPath: this._customIcon,
            });
        if (this._iconTheme === 'symbolic')
            return new St.Icon({
                icon_name: 'network-transmit-receive-symbolic',
                icon_size: 16,
                style_class: 'uthy-theme-icon',
            });
        const bundledName = this._iconTheme === 'network' ? 'brand' : iconName;
        return this._controller.createIcon({
            iconName: bundledName,
            iconSize: 16,
            styleClass: 'uthy-panel-icon',
        });
    }

    _createLabel(text, styleClass) {
        return new St.Label({text, style_class: styleClass, y_align: Clutter.ActorAlign.CENTER});
    }

    _setAccessibleName(name) {
        this._button?.set_accessible_name(name);
    }

    _syncMenu() {
        if (!this._button)
            return;
        const visible = Boolean(this._controller?.actor.visible);
        this._showItem.label.text = visible ? 'Hide widget' : 'Show widget';
        this._pauseItem.label.text = this._monitor?.paused ? 'Resume monitoring' : 'Pause monitoring';
    }
}

export {MODE_LABELS};
