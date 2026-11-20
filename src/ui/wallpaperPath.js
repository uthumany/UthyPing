const WALLPAPER_PATTERN = /\.(png|jpe?g|webp)$/i;

export function isValidWallpaperPath(value) {
    if (typeof value !== 'string')
        return false;
    const path = value.trim();
    if (!path || /^([a-z]+:|\/\/)/i.test(path))
        return false;
    if (!(path.startsWith('/') || path.startsWith('~/')))
        return false;
    return WALLPAPER_PATTERN.test(path);
}
