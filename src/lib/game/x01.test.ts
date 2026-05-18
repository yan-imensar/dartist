import { describe, expect, it } from 'vitest';
import { applyX01Turn, defaultX01Settings } from './x01';
import type { DartThrow } from './types';

const settings = defaultX01Settings(501);
const settingsNoDoubleOut = { ...settings, doubleOut: false };

describe('applyX01Turn — normal scoring', () => {
	it('subtracts the entered score from scoreBefore (501 - 60 = 441)', () => {
		const result = applyX01Turn({ scoreBefore: 501, scoreEntered: 60, settings });
		expect(result).toMatchObject({
			scoreApplied: 60,
			scoreAfter: 441,
			isBust: false,
			isCheckout: false
		});
	});

	it('handles 0 as a miss without busting', () => {
		const result = applyX01Turn({ scoreBefore: 100, scoreEntered: 0, settings });
		expect(result.scoreAfter).toBe(100);
		expect(result.isBust).toBe(false);
		expect(result.isCheckout).toBe(false);
	});
});

describe('applyX01Turn — bust rules', () => {
	it('busts when score would go below zero', () => {
		const result = applyX01Turn({ scoreBefore: 40, scoreEntered: 41, settings });
		expect(result.isBust).toBe(true);
		expect(result.reason).toBe('below_zero');
		expect(result.scoreAfter).toBe(40);
		expect(result.scoreApplied).toBe(0);
	});

	it('busts when score would leave 1 with double-out enabled', () => {
		const result = applyX01Turn({ scoreBefore: 40, scoreEntered: 39, settings });
		expect(result.isBust).toBe(true);
		expect(result.reason).toBe('left_one');
		expect(result.scoreAfter).toBe(40);
	});

	it('does not bust on leaving 1 when double-out is disabled', () => {
		const result = applyX01Turn({
			scoreBefore: 40,
			scoreEntered: 39,
			settings: settingsNoDoubleOut
		});
		expect(result.isBust).toBe(false);
		expect(result.scoreAfter).toBe(1);
	});
});

describe('applyX01Turn — double-out checkout', () => {
	it('checks out on double 20 finishing 40', () => {
		const darts: DartThrow[] = [{ segment: 20, multiplier: 2, score: 40 }];
		const result = applyX01Turn({ scoreBefore: 40, scoreEntered: 40, darts, settings });
		expect(result.isCheckout).toBe(true);
		expect(result.scoreAfter).toBe(0);
	});

	it('checks out on bullseye (D-Bull) finishing 50', () => {
		const darts: DartThrow[] = [{ segment: 25, multiplier: 2, score: 50 }];
		const result = applyX01Turn({ scoreBefore: 50, scoreEntered: 50, darts, settings });
		expect(result.isCheckout).toBe(true);
	});

	it('busts when last dart is not a double under double-out', () => {
		const darts: DartThrow[] = [
			{ segment: 20, multiplier: 1, score: 20 },
			{ segment: 20, multiplier: 1, score: 20 }
		];
		const result = applyX01Turn({ scoreBefore: 40, scoreEntered: 40, darts, settings });
		expect(result.isBust).toBe(true);
		expect(result.reason).toBe('double_out_required');
		expect(result.scoreAfter).toBe(40);
	});

	it('checks out without double when double-out disabled', () => {
		const result = applyX01Turn({
			scoreBefore: 40,
			scoreEntered: 40,
			settings: settingsNoDoubleOut
		});
		expect(result.isCheckout).toBe(true);
		expect(result.scoreAfter).toBe(0);
	});
});

describe('applyX01Turn — simple total entry confirmation flow', () => {
	it('requires explicit double-finish confirmation when no darts detail provided', () => {
		const result = applyX01Turn({ scoreBefore: 40, scoreEntered: 40, settings });
		expect(result.isBust).toBe(true);
		expect(result.reason).toBe('double_out_required');
	});

	it('accepts checkout when user confirms double finish via flag', () => {
		const result = applyX01Turn({
			scoreBefore: 40,
			scoreEntered: 40,
			settings,
			confirmDoubleFinish: true
		});
		expect(result.isCheckout).toBe(true);
		expect(result.scoreAfter).toBe(0);
	});
});

describe('applyX01Turn — darts/total consistency', () => {
	it('busts when darts sum does not match scoreEntered', () => {
		const darts: DartThrow[] = [{ segment: 20, multiplier: 3, score: 60 }];
		const result = applyX01Turn({
			scoreBefore: 501,
			scoreEntered: 50,
			darts,
			settings
		});
		expect(result.isBust).toBe(true);
	});

	it('rejects more than maxDartsPerTurn darts', () => {
		const darts: DartThrow[] = [
			{ segment: 20, multiplier: 1, score: 20 },
			{ segment: 20, multiplier: 1, score: 20 },
			{ segment: 20, multiplier: 1, score: 20 },
			{ segment: 20, multiplier: 1, score: 20 }
		];
		const result = applyX01Turn({
			scoreBefore: 501,
			scoreEntered: 80,
			darts,
			settings
		});
		expect(result.isBust).toBe(true);
	});

	it('rejects darts with invalid segment/score arithmetic', () => {
		const darts: DartThrow[] = [{ segment: 20, multiplier: 3, score: 50 }];
		const result = applyX01Turn({
			scoreBefore: 501,
			scoreEntered: 50,
			darts,
			settings
		});
		expect(result.isBust).toBe(true);
	});
});
