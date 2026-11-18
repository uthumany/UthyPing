export const VALID_PANEL_ICON_THEMES = ['glass', 'network', 'symbolic'];

const MAX_CUSTOM_ICON_PATH_LENGTH = 4096;

/**
 * Accept an empty path to disable the override, or a local SVG path.
 * Remote URIs and non-SVG files are deliberately rejected because GNOME Shell
 * should never fetch or execute an external resource for a panel icon.
 */
export function isValidCustomSvgPath(value) {
    if (value === '')
        return true;
    if (typeof value !== 'string')
        return false;
    const path = value.trim();
    if (!path || path.length > MAX_CUSTOM_ICON_PATH_LENGTH || path.includes('://'))
        return false;
    if (!/\.svg$/i.test(path))
        return false;
    return path.startsWith('/') || path.startsWith('~/');
}

export function normalizeCustomSvgPath(value) {
    if (typeof value !== 'string')
        return '';
    const path = value.trim();
    return isValidCustomSvgPath(path) ? path : '';
}
