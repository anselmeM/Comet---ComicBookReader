import { setImageBlobs, reverseImageBlobs, getState, resetAllState, DOUBLE_TAP_ZOOM_SCALE, setCurrentImageIndex } from '../js/comet-state.js';
import assert from 'node:assert';
import test, { beforeEach } from 'node:test';

test('comet-state: setCurrentImageIndex', async (t) => {
    beforeEach(() => {
        resetAllState();
    });

    await t.test('should update currentImageIndex correctly', () => {
        setCurrentImageIndex(5);
        const { currentImageIndex } = getState();
        assert.strictEqual(currentImageIndex, 5);
    });

    await t.test('should overwrite previous currentImageIndex', () => {
        setCurrentImageIndex(2);
        const { currentImageIndex: initialImageIndex } = getState();
        assert.strictEqual(initialImageIndex, 2);

        setCurrentImageIndex(10);
        const { currentImageIndex: updatedImageIndex } = getState();
        assert.strictEqual(updatedImageIndex, 10);
    });
});

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

test('comet-state: Constants', async (t) => {
    await t.test('DOUBLE_TAP_ZOOM_SCALE should be exported and set to 2.5', () => {
        assert.strictEqual(DOUBLE_TAP_ZOOM_SCALE, 2.5);
    });
});
