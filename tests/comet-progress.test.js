import test from 'node:test';
import assert from 'node:assert';
import { getProgress, saveProgress, clearProgress, resetProgressCache } from '../js/comet-progress.js';

// Setup basic global window and localStorage mocks
const mockStorage = new Map();
globalThis.localStorage = {
    getItem(key) { return mockStorage.get(key) || null; },
    setItem(key, val) { mockStorage.set(key, String(val)); },
    removeItem(key) { mockStorage.delete(key); },
    clear() { mockStorage.clear(); }
};

globalThis.window = {
    listeners: {},
    addEventListener(evt, fn) {
        if (!this.listeners[evt]) this.listeners[evt] = [];
        this.listeners[evt].push(fn);
    },
    dispatchEvent(evt) {
        if (this.listeners[evt.type]) {
            this.listeners[evt.type].forEach(fn => fn(evt));
        }
    }
};

const PROGRESS_KEY = 'comet-progress';

test('comet-progress caching logic', async (t) => {
    t.beforeEach(() => {
        mockStorage.clear();
        resetProgressCache();
    });

    await t.test('saveProgress writes to localStorage on first save', () => {
        saveProgress('file1', 'comic.cbz', 0, 10);
        const data = JSON.parse(mockStorage.get(PROGRESS_KEY) || '{}');
        assert.ok(data['file1'], 'file1 should be in localStorage');
        assert.strictEqual(data['file1'].lastPage, 0);
    });

    await t.test('saveProgress updates cache but not localStorage when only time changes', () => {
        // Initial save
        saveProgress('file1', 'comic.cbz', 5, 10);

        // Let's modify the raw storage to see if the next save overwrites it
        const originalData = JSON.parse(mockStorage.get(PROGRESS_KEY));
        const originalTime = originalData['file1'].lastRead;

        globalThis.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ file1: { ...originalData['file1'], lastRead: 'MODIFIED_IN_STORAGE' } }));

        // Second save with SAME page index
        saveProgress('file1', 'comic.cbz', 5, 10);

        // localStorage should still have 'MODIFIED_IN_STORAGE' because saveProgress
        // skipped serialization to localStorage since page didn't change.
        const newData = JSON.parse(mockStorage.get(PROGRESS_KEY));
        assert.strictEqual(newData['file1'].lastRead, 'MODIFIED_IN_STORAGE');

        // But getProgress should return the updated cached version with a valid ISO string
        const cacheData = getProgress('file1');
        assert.notStrictEqual(cacheData.lastRead, 'MODIFIED_IN_STORAGE');
    });

    await t.test('saveProgress updates localStorage when page index changes', async () => {
        saveProgress('file1', 'comic.cbz', 5, 10);
        const firstData = JSON.parse(mockStorage.get(PROGRESS_KEY));

        // Wait briefly so timestamp changes
        await new Promise(r => setTimeout(r, 10));

        // Change page
        saveProgress('file1', 'comic.cbz', 6, 10);
        const secondData = JSON.parse(mockStorage.get(PROGRESS_KEY));

        assert.notStrictEqual(firstData['file1'].lastRead, secondData['file1'].lastRead);
        assert.strictEqual(secondData['file1'].lastPage, 6);
    });

    await t.test('clearProgress deletes from cache and localStorage', () => {
        saveProgress('file1', 'comic.cbz', 5, 10);
        assert.ok(getProgress('file1'));

        clearProgress('file1');
        assert.strictEqual(getProgress('file1'), null);

        const stored = JSON.parse(mockStorage.get(PROGRESS_KEY) || '{}');
        assert.strictEqual(stored['file1'], undefined);
    });
});
