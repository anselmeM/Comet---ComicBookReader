import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Service Worker: Cache List Consistency', async (t) => {
    const swContent = fs.readFileSync('sw.js', 'utf8');
    const match = swContent.match(/const urlsToCache = \[([\s\S]*?)\];/);
    assert.ok(match, 'Could not find urlsToCache array in sw.js');

    const arrayContent = match[1];

    // Clean up the array content
    const cachedFiles = arrayContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => {
             if (line.endsWith(',')) return line.slice(0, -1);
             return line;
        })
        .filter(line => (line.startsWith("'") || line.startsWith('"')))
        .map(line => line.slice(1, -1));

    // 1. Verify all cached files exist on disk
    await t.test('All cached files must exist on disk', () => {
        const missingFiles = [];
        cachedFiles.forEach(file => {
            if (file.startsWith('http')) return;

            const filePath = path.join(process.cwd(), file);
            if (!fs.existsSync(filePath)) {
                missingFiles.push(file);
            }
        });

        if (missingFiles.length > 0) {
            console.error('Files listed in sw.js but missing on disk:', missingFiles);
        }
        assert.strictEqual(missingFiles.length, 0, `Found ${missingFiles.length} missing files in cache list: ${missingFiles.join(', ')}`);
    });

    // 2. Verify core assets are cached
    // Helper to check directory
    const checkDir = (dir, ext) => {
        const files = fs.readdirSync(dir).filter(f => f.endsWith(ext));
        const missing = [];
        files.forEach(f => {
            const relativePath = `./${dir}/${f}`;
            if (!cachedFiles.includes(relativePath)) {
                missing.push(relativePath);
            }
        });
        if (missing.length > 0) console.error(`Files in ${dir} missing from cache:`, missing);
        assert.strictEqual(missing.length, 0, `Found ${missing.length} ${ext} files in ${dir} missing from cache`);
    };

    await t.test('All CSS files in css/ should be cached', () => {
        checkDir('css', '.css');
    });

    await t.test('All JS files in js/ should be cached', () => {
        checkDir('js', '.js');
    });

    await t.test('All PNG icons in icons/ should be cached', () => {
        checkDir('icons', '.png');
    });

    await t.test('All HTML files in root should be cached', () => {
        const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
        const missing = [];
        files.forEach(f => {
            const relativePath = `./${f}`;
            if (!cachedFiles.includes(relativePath)) {
                missing.push(relativePath);
            }
        });
        assert.strictEqual(missing.length, 0, `Found ${missing.length} HTML files missing from cache: ${missing.join(', ')}`);
    });
});
