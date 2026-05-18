import { describe, expect, it } from 'vitest';
import { isImpossibleCheckout, MAX_CHECKOUT, suggestCheckout } from './checkouts';

describe('suggestCheckout', () => {
	it('returns a known checkout for 170 (T20 T20 Bull)', () => {
		expect(suggestCheckout(170)).toBe('T20 T20 Bull');
	});

	it('returns Bull for 50', () => {
		expect(suggestCheckout(50)).toBe('Bull');
	});

	it('returns D20 for 40', () => {
		expect(suggestCheckout(40)).toBe('D20');
	});

	it('returns D1 for the lowest checkout (2)', () => {
		expect(suggestCheckout(2)).toBe('D1');
	});

	it('returns null for scores above 170', () => {
		expect(suggestCheckout(171)).toBeNull();
		expect(suggestCheckout(180)).toBeNull();
	});

	it('returns null for impossible double-out values', () => {
		for (const impossible of [159, 162, 163, 165, 166, 168, 169]) {
			expect(suggestCheckout(impossible)).toBeNull();
		}
	});

	it('returns null for 1 and 0 (no double can finish these)', () => {
		expect(suggestCheckout(1)).toBeNull();
		expect(suggestCheckout(0)).toBeNull();
	});

	it('rejects non-integer input', () => {
		expect(suggestCheckout(40.5)).toBeNull();
	});
});

describe('isImpossibleCheckout', () => {
	it('flags 169 as impossible', () => {
		expect(isImpossibleCheckout(169)).toBe(true);
	});

	it('flags MAX_CHECKOUT+1 as impossible', () => {
		expect(isImpossibleCheckout(MAX_CHECKOUT + 1)).toBe(true);
	});

	it('does not flag 170 as impossible', () => {
		expect(isImpossibleCheckout(170)).toBe(false);
	});
});
