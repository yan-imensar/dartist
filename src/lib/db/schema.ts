import type { DartThrow, GameMode, X01Settings } from '$lib/game/types';

export type SyncState = 'local' | 'pending' | 'synced' | 'conflict';

export type MatchStatus = 'draft' | 'active' | 'finished' | 'abandoned';
export type LegStatus = 'active' | 'finished';

export type SyncOperation = 'upsert' | 'delete';

export type SyncEntityType = 'player' | 'match' | 'matchPlayer' | 'leg' | 'turn';

export type Device = {
	id: string;
	name: string;
	createdAt: string;
};

export type Player = {
	id: string;
	name: string;
	color?: string;
	avatarUrl?: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	syncState: SyncState;
	remoteId: string | null;
};

export type MatchSettings = X01Settings | Record<string, unknown>;

export type Match = {
	id: string;
	mode: GameMode;
	status: MatchStatus;
	createdAt: string;
	startedAt: string | null;
	finishedAt: string | null;
	updatedAt: string;
	settings: MatchSettings;
	winnerPlayerId: string | null;
	syncState: SyncState;
	remoteId: string | null;
};

export type MatchPlayer = {
	id: string;
	matchId: string;
	playerId: string;
	position: number;
	startingScore: number;
	finalRank: number | null;
};

export type Leg = {
	id: string;
	matchId: string;
	legIndex: number;
	status: LegStatus;
	startedAt: string;
	finishedAt: string | null;
	winnerPlayerId: string | null;
};

export type Turn = {
	id: string;
	matchId: string;
	playerId: string;
	legId: string | null;
	turnIndex: number;
	createdAt: string;
	enteredAt: string;
	scoreBefore: number;
	scoreEntered: number;
	scoreApplied: number;
	scoreAfter: number;
	isBust: boolean;
	isCheckout: boolean;
	darts: DartThrow[];
	correctionOfTurnId: string | null;
	revertedAt: string | null;
	syncState: SyncState;
	remoteId: string | null;
};

export type SyncQueueItem = {
	id: string;
	entityType: SyncEntityType;
	entityId: string;
	operation: SyncOperation;
	payload: unknown;
	createdAt: string;
	attempts: number;
	lastAttemptAt: string | null;
	lastError: string | null;
};

export type SettingsRow = {
	key: string;
	value: unknown;
};
