import type { ApplyTurnInput, ApplyTurnResult, DartThrow, X01Settings } from './types';

const SEGMENT_RANGE = { min: 1, max: 20 } as const;
const BULL_SEGMENT = 25;

function isValidDart(dart: DartThrow): boolean {
	const { segment, multiplier, score } = dart;
	if (segment === 0) return multiplier === 1 && score === 0;
	if (segment === BULL_SEGMENT) {
		if (multiplier === 1) return score === 25;
		if (multiplier === 2) return score === 50;
		return false;
	}
	if (segment < SEGMENT_RANGE.min || segment > SEGMENT_RANGE.max) return false;
	return score === segment * multiplier;
}

function dartsTotal(darts: DartThrow[]): number {
	return darts.reduce((sum, d) => sum + d.score, 0);
}

function isFinishingDouble(dart: DartThrow | undefined): boolean {
	if (!dart) return false;
	if (dart.segment === BULL_SEGMENT && dart.multiplier === 2) return true;
	return dart.multiplier === 2 && dart.segment >= 1 && dart.segment <= 20;
}

export function defaultX01Settings(startingScore = 501): X01Settings {
	return {
		startingScore,
		doubleOut: true,
		straightIn: true,
		maxDartsPerTurn: 3,
		bestOfLegs: 1
	};
}

export function legsToWin(bestOfLegs: number): number {
	const n = Math.max(1, Math.floor(bestOfLegs));
	return Math.floor(n / 2) + 1;
}

export function applyX01Turn(input: ApplyTurnInput): ApplyTurnResult {
	const { scoreBefore, scoreEntered, darts, settings, confirmDoubleFinish } = input;

	if (darts && darts.length > 0) {
		if (darts.length > settings.maxDartsPerTurn || darts.some((d) => !isValidDart(d))) {
			return bust(scoreBefore, scoreEntered, 'below_zero');
		}
		const sum = dartsTotal(darts);
		if (sum !== scoreEntered) {
			return bust(scoreBefore, scoreEntered, 'below_zero');
		}
	}

	const projected = scoreBefore - scoreEntered;

	if (projected < 0) return bust(scoreBefore, scoreEntered, 'below_zero');
	if (settings.doubleOut && projected === 1) return bust(scoreBefore, scoreEntered, 'left_one');

	if (projected === 0) {
		if (!settings.doubleOut) return checkout(scoreEntered);
		if (darts && darts.length > 0) {
			const last = darts[darts.length - 1];
			return isFinishingDouble(last)
				? checkout(scoreEntered)
				: bust(scoreBefore, scoreEntered, 'double_out_required');
		}
		return confirmDoubleFinish
			? checkout(scoreEntered)
			: bust(scoreBefore, scoreEntered, 'double_out_required');
	}

	return {
		scoreApplied: scoreEntered,
		scoreAfter: projected,
		isBust: false,
		isCheckout: false
	};
}

function bust(
	scoreBefore: number,
	scoreEntered: number,
	reason: ApplyTurnResult['reason']
): ApplyTurnResult {
	return {
		scoreApplied: 0,
		scoreAfter: scoreBefore,
		isBust: true,
		isCheckout: false,
		reason
	};
}

function checkout(scoreEntered: number): ApplyTurnResult {
	return {
		scoreApplied: scoreEntered,
		scoreAfter: 0,
		isBust: false,
		isCheckout: true
	};
}
