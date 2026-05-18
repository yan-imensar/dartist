import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '$env/dynamic/private';

const DDL = `
CREATE TABLE IF NOT EXISTS players (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT NOT NULL,
	color TEXT,
	avatarUrl TEXT,
	createdAt TEXT NOT NULL,
	updatedAt TEXT NOT NULL,
	deletedAt TEXT,
	PRIMARY KEY (owner, id)
);
CREATE INDEX IF NOT EXISTS idx_players_owner_updated ON players(owner, updatedAt);

CREATE TABLE IF NOT EXISTS matches (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	mode TEXT NOT NULL,
	status TEXT NOT NULL,
	createdAt TEXT NOT NULL,
	startedAt TEXT,
	finishedAt TEXT,
	updatedAt TEXT NOT NULL,
	settings TEXT NOT NULL,
	winnerPlayerId TEXT,
	PRIMARY KEY (owner, id)
);
CREATE INDEX IF NOT EXISTS idx_matches_owner_updated ON matches(owner, updatedAt);

CREATE TABLE IF NOT EXISTS matchPlayers (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	matchId TEXT NOT NULL,
	playerId TEXT NOT NULL,
	position INTEGER NOT NULL,
	startingScore INTEGER NOT NULL,
	finalRank INTEGER,
	updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
CREATE INDEX IF NOT EXISTS idx_matchPlayers_owner_updated ON matchPlayers(owner, updatedAt);

CREATE TABLE IF NOT EXISTS legs (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	matchId TEXT NOT NULL,
	legIndex INTEGER NOT NULL,
	status TEXT NOT NULL,
	startedAt TEXT NOT NULL,
	finishedAt TEXT,
	winnerPlayerId TEXT,
	updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
CREATE INDEX IF NOT EXISTS idx_legs_owner_updated ON legs(owner, updatedAt);

CREATE TABLE IF NOT EXISTS turns (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	matchId TEXT NOT NULL,
	playerId TEXT NOT NULL,
	legId TEXT,
	legIndex INTEGER NOT NULL,
	turnIndex INTEGER NOT NULL,
	createdAt TEXT NOT NULL,
	enteredAt TEXT NOT NULL,
	scoreBefore INTEGER NOT NULL,
	scoreEntered INTEGER NOT NULL,
	scoreApplied INTEGER NOT NULL,
	scoreAfter INTEGER NOT NULL,
	isBust INTEGER NOT NULL,
	isCheckout INTEGER NOT NULL,
	darts TEXT NOT NULL,
	correctionOfTurnId TEXT,
	revertedAt TEXT,
	updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
CREATE INDEX IF NOT EXISTS idx_turns_owner_updated ON turns(owner, updatedAt);
`;

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
	if (instance) return instance;
	const dataDir = env.DATA_DIR ?? '.data';
	const dbPath = `${dataDir}/dartist.db`;
	mkdirSync(dirname(dbPath), { recursive: true });

	instance = new Database(dbPath);
	instance.pragma('journal_mode = WAL');
	instance.pragma('foreign_keys = ON');
	instance.exec(DDL);
	return instance;
}
