import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { DartsDb } from './client';
import { createRepositories, type Repositories } from './repositories';

export type TestHarness = {
	db: DartsDb;
	repos: Repositories;
	close: () => Promise<void>;
};

export async function createTestDb(): Promise<TestHarness> {
	globalThis.indexedDB = new IDBFactory();
	const db = new DartsDb(`darts-test-${Math.random().toString(36).slice(2)}`);
	await db.open();
	return {
		db,
		repos: createRepositories(db),
		close: async () => {
			db.close();
		}
	};
}
