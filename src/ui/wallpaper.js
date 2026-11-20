import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import {isValidWallpaperPath} from './wallpaperPath.js';

/**
 * User wallpapers are deliberately local-only. Besides avoiding a network
 * dependency in the shell, this makes the selected artwork stable while the
 * widget is visible and avoids loading untrusted remote CSS resources.
 */
export function expandWallpaperPath(value) {
    const path = (value ?? '').trim();
    if (path.startsWith('~/'))
        return GLib.build_filenamev([GLib.get_home_dir(), path.slice(2)]);
    return path;
}

function escapeCssUri(uri) {
    return uri.replaceAll('\\', '%5C').replaceAll('"', '%22').replaceAll(' ', '%20');
}

export function wallpaperStyle(path) {
    if (!path)
        return 'background-color: transparent; background-image: none; border-radius: 0; opacity: 1.0;';
    const file = Gio.File.new_for_path(path);
    return [
        'background-color: rgba(0, 0, 0, 1.0);',
        `background-image: url("${escapeCssUri(file.get_uri())}");`,
        'background-size: cover;',
        'background-position: 0px 0px;',
        'border-radius: 0;',
        'opacity: 1.0;',
    ].join(' ');
}

export function resolveWallpaperPath({configuredPath = '', presetPath = '', bundledPath}) {
    if (presetPath === null)
        return null;
    if (presetPath && Gio.File.new_for_path(presetPath).query_exists(null))
        return presetPath;
    const configured = isValidWallpaperPath(configuredPath)
        ? expandWallpaperPath(configuredPath) : '';
    if (configured && Gio.File.new_for_path(configured).query_exists(null))
        return configured;
    return bundledPath;
}

export function createWallpaperLayer({bundledPath, configuredPath = '', presetPath = ''}) {
    const layer = new St.Widget({
        style_class: 'uthy-wallpaper-layer',
        x_expand: true,
        y_expand: true,
        reactive: false,
        can_focus: false,
    });
    layer._uthyBundledPath = bundledPath;
    layer._uthyConfiguredPath = configuredPath;
    layer._uthyPresetPath = presetPath;
    layer._uthyResolvedPath = '';

    layer.setWallpaper = (path, selectedPresetPath = '') => {
        const resolved = resolveWallpaperPath({
            configuredPath: path,
            presetPath: selectedPresetPath,
            bundledPath: layer._uthyBundledPath,
        });
        if (resolved === layer._uthyResolvedPath)
            return;
        layer._uthyConfiguredPath = path ?? '';
        layer._uthyPresetPath = selectedPresetPath;
        layer._uthyResolvedPath = resolved;
        layer.set_style(wallpaperStyle(resolved));
    };

    layer.setWallpaper(configuredPath, presetPath);
    return layer;
}
