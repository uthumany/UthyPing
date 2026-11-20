export const WALLPAPER_PRESETS = [
    {key: 'none', label: 'No background', filename: null},
    {key: 'forest', label: 'Forest glow', filename: 'bg.png'},
    {key: 'aurora', label: 'Aurora night', filename: 'bg-aurora.png'},
    {key: 'midnight', label: 'Midnight ridge', filename: 'bg-midnight.png'},
    {key: 'ember', label: 'Ember dusk', filename: 'bg-ember.png'},
    {key: 'custom', label: 'Custom local wallpaper', filename: null},
];

export const DEFAULT_WALLPAPER_PRESET = 'forest';

export function isValidWallpaperPreset(value) {
    return WALLPAPER_PRESETS.some(preset => preset.key === value);
}

export function wallpaperPreset(key) {
    return WALLPAPER_PRESETS.find(preset => preset.key === key)
        ?? WALLPAPER_PRESETS[0];
}
