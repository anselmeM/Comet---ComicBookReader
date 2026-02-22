import { setImageBlobs, reverseImageBlobs, getState, resetAllState, addObjectUrl } from '../js/comet-state.js';
import assert from 'node:assert';
import test, { beforeEach, afterEach } from 'node:test';

test('comet-state: reverseImageBlobs', async (t) => {
    beforeEach(() => {
        resetAllState();
    });

    await t.test('should reverse a multi-element array of blobs', () => {
        const mockBlobs = ['blob1', 'blob2', 'blob3'];
        setImageBlobs([...mockBlobs]);

        reverseImageBlobs();

        const { imageBlobs } = getState();
        assert.deepStrictEqual(imageBlobs, ['blob3', 'blob2', 'blob1']);
    });

    await t.test('should handle an empty array', () => {
        setImageBlobs([]);

        reverseImageBlobs();

        const { imageBlobs } = getState();
        assert.deepStrictEqual(imageBlobs, []);
    });

    await t.test('should handle a single-element array', () => {
        const mockBlobs = ['blob1'];
        setImageBlobs([...mockBlobs]);

        reverseImageBlobs();

        const { imageBlobs } = getState();
        assert.deepStrictEqual(imageBlobs, ['blob1']);
    });

    await t.test('should maintain the same array reference (in-place reverse)', () => {
        const mockBlobs = ['blob1', 'blob2'];
        setImageBlobs(mockBlobs);

        reverseImageBlobs();

        const { imageBlobs } = getState();
        assert.strictEqual(imageBlobs, mockBlobs);
        assert.deepStrictEqual(imageBlobs, ['blob2', 'blob1']);
    });
});

test('comet-state: memory management (LRU blob release)', async (t) => {
    let originalURL;

    beforeEach(() => {
        resetAllState();
        originalURL = global.URL;
        // Mock URL API
        global.URL = {
            createObjectURL: (blob) => `blob:${Math.random()}`,
            revokeObjectURL: (url) => {}
        };
    });

    afterEach(() => {
        global.URL = originalURL;
    });

    await t.test('should release blob memory when evicted from cache if reloadable', () => {
        const entries = [];
        // Create 25 entries (limit is 20)
        for (let i = 0; i < 25; i++) {
            entries.push({
                name: `page${i}`,
                blob: { size: 1000 },
                fileData: { async: () => Promise.resolve('newBlob') }
            });
        }

        // Add first 20 entries
        for (let i = 0; i < 20; i++) {
            addObjectUrl(entries[i], `url${i}`);
        }

        // Add 21st entry -> evicts entry 0
        addObjectUrl(entries[20], 'url20');

        // Verify entry 0 blob is released
        assert.strictEqual(entries[0].blob, null, 'Entry 0 blob should be released');

        // Verify entry 1-20 still have blobs
        for (let i = 1; i <= 20; i++) {
             assert.ok(entries[i].blob, `Entry ${i} should have blob`);
        }
    });

    await t.test('should NOT release blob if fileData is missing (e.g. CBR)', () => {
        const entry = {
            name: 'cbrPage',
            blob: { size: 1000 },
            fileData: null
        };

        // Fill cache with dummy entries
        for(let i=0; i<20; i++) {
            addObjectUrl({ name: `dummy${i}`, blob: {}, fileData: {} }, `url${i}`);
        }

        addObjectUrl(entry, 'cbrUrl');
        // Push enough items to evict cbrEntry
        for(let i=0; i<25; i++) {
             addObjectUrl({ name: `flush${i}`, blob: {}, fileData: {} }, `flushUrl${i}`);
        }

        assert.ok(entry.blob, 'CBR blob should remain in memory');
    });

    await t.test('should NOT release blob if entry is a Smart Split "Part 1"', () => {
        const entry = {
            name: 'page1_part1',
            blob: { size: 1000 },
            fileData: { async: () => Promise.resolve('originalBlob') }
        };

        // Fill cache
        for(let i=0; i<20; i++) {
            addObjectUrl({ name: `dummy${i}`, blob: {}, fileData: {} }, `url${i}`);
        }

        addObjectUrl(entry, 'splitUrl');
        // Flush cache
        for(let i=0; i<25; i++) {
             addObjectUrl({ name: `flush${i}`, blob: {}, fileData: {} }, `flushUrl${i}`);
        }

        assert.ok(entry.blob, 'Split Part 1 blob should remain in memory');
    });
});
