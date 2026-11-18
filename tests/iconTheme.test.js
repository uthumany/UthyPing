import test from 'node:test';
import assert from 'node:assert/strict';
import {isValidCustomSvgPath, normalizeCustomSvgPath, VALID_PANEL_ICON_THEMES} from '../src/ui/iconTheme.js';

test('icon themes expose the built-in theme choices', () => {
    assert.deepEqual(VALID_PANEL_ICON_THEMES, ['glass', 'network', 'symbolic']);
});

test('custom SVG validation accepts local absolute and home-relative paths', () => {
    assert.equal(isValidCustomSvgPath('/tmp/uthyping.svg'), true);
    assert.equal(isValidCustomSvgPath('~/Pictures/uthyping.svg'), true);
    assert.equal(isValidCustomSvgPath(''), true);
});

test('custom SVG validation rejects remote, non-SVG, and relative paths', () => {
    assert.equal(isValidCustomSvgPath('https://example.com/uthyping.svg'), false);
    assert.equal(isValidCustomSvgPath('/tmp/uthyping.png'), false);
    assert.equal(isValidCustomSvgPath('icons/uthyping.svg'), false);
    assert.equal(normalizeCustomSvgPath('  /tmp/uthyping.svg  '), '/tmp/uthyping.svg');
    assert.equal(normalizeCustomSvgPath('/tmp/uthyping.png'), '');
});
