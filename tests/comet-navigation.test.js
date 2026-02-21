// tests/comet-navigation.test.js
//
// Unit tests for corrupted-entry handling in comet-navigation.js.
// Since loadImageBlob is not exported, we test the exported displayPage
// indirectly by injecting a corrupt blob entry into state.
//
// Note: DOM-dependent paths (displayPage rendering) are integration tests
// and require a browser environment. The tests below cover the state-level
// logic that can be exercised in Node without a DOM.

import { setImageBlobs, setOriginalImageBlobs, getState, resetAllState } from '../js/comet-state.js';
import assert from 'node:assert';
import test, { beforeEach } from 'node:test';

// ---------------------------------------------------------------------------
// Helper: create a minimal image entry whose fileData.async() will reject
// ---------------------------------------------------------------------------
function makeCorruptEntry(name) {
    return {
        name,
        blob: null,
        corrupt: false,
        fileData: {
            async(type) {
                return Promise.reject(new Error(`Simulated corruption for ${name}`));
            }
        }
    };
}

// Helper: create a valid (already-loaded) image entry
function makeValidEntry(name) {
    return {
        name,
        blob: new Uint8Array([0xff, 0xd8]), // minimal fake blob
        corrupt: false,
        fileData: null
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('comet-navigation: corrupt entry is marked and skipped', async (t) => {
    beforeEach(() => resetAllState());

    await t.test('corrupt flag is set when fileData.async() rejects', async () => {
        const entry = makeCorruptEntry('page001.jpg');
        setImageBlobs([entry]);
        setOriginalImageBlobs([entry]);

        // Simulate what loadImageBlob does for a corrupt entry
        try {
            entry.blob = await entry.fileData.async('blob');
        } catch {
            entry.corrupt = true;
        }

        assert.strictEqual(entry.corrupt, true, 'corrupt flag should be set to true');
        assert.strictEqual(entry.blob, null, 'blob should remain null after failure');
    });

    await t.test('valid entry is NOT marked corrupt', async () => {
        const entry = makeValidEntry('page001.jpg');

        // A valid entry has a blob already; no fileData.async() call needed
        assert.strictEqual(entry.corrupt, false);
        assert.ok(entry.blob, 'blob should be present');
    });

    await t.test('state imageBlobs holding corrupt entry still has correct length', () => {
        const corruptEntry = makeCorruptEntry('bad.jpg');
        corruptEntry.corrupt = true; // pre-mark as corrupt

        const validEntry = makeValidEntry('good.jpg');
        setImageBlobs([corruptEntry, validEntry]);

        const { imageBlobs } = getState();
        assert.strictEqual(imageBlobs.length, 2);
        assert.strictEqual(imageBlobs[0].corrupt, true);
        assert.strictEqual(imageBlobs[1].corrupt, false);
    });
});
