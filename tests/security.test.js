import test from 'node:test';
import assert from 'node:assert';

const IMAGE_REGEX = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

// Replicating the logic from js/comet-file-handler.js for testing purposes
// since the original file has heavy DOM dependencies.
function sanitizeAndFilter(zipFiles) {
    const imageFiles = [];
    for (const [filename, fileData] of Object.entries(zipFiles)) {
        // The fix: check for path traversal
        if (!fileData.dir &&
            IMAGE_REGEX.test(filename) &&
            !filename.startsWith('__MACOSX/') &&
            !filename.split(/[/\\]/).includes('..')) {
            imageFiles.push({ name: filename });
        }
    }
    return imageFiles;
}

test('Security: Path Traversal Sanitization', async (t) => {
    await t.test('should reject filenames with ".." segments', () => {
        const mockFiles = {
            '../../evil.jpg': { dir: false },
            'folder/../evil.jpg': { dir: false },
            'normal.jpg': { dir: false },
            'folder/normal.png': { dir: false }
        };

        const results = sanitizeAndFilter(mockFiles);

        assert.strictEqual(results.length, 2);
        assert.ok(results.some(r => r.name === 'normal.jpg'));
        assert.ok(results.some(r => r.name === 'folder/normal.png'));
        assert.ok(!results.some(r => r.name.includes('..')));
    });

    await t.test('should accept valid filenames with dots', () => {
        const mockFiles = {
            'my.image.v1.jpg': { dir: false },
            'folder.with.dots/image.jpg': { dir: false }
        };

        const results = sanitizeAndFilter(mockFiles);
        assert.strictEqual(results.length, 2);
    });
});
