export type GameMode = 'x01' | 'around_the_clock';

export type DartMultiplier = 1 | 2 | 3;

export type DartThrow = {
	segment: number;
	multiplier: DartMultiplier;
	score: number;
};

export type X01Settings = {
	startingScore: number;
	doubleOut: boolean;
	straightIn: boolean;
	maxDartsPerTurn: number;
};

export type BustReason = 'below_zero' | 'left_one' | 'double_out_required';

export type ApplyTurnInput = {
	scoreBefore: number;
	scoreEntered: number;
	darts?: DartThrow[];
	settings: X01Settings;
	confirmDoubleFinish?: boolean;
};

export type ApplyTurnResult = {
	scoreApplied: number;
	scoreAfter: number;
	isBust: boolean;
	isCheckout: boolean;
	reason?: BustReason;
};
