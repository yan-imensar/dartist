import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestHarness } from '../test-utils';

describe('PlayersRepository', () => {
	let harness: TestHarness;

	beforeEach(async () => {
		harness = await createTestDb();
	});

	afterEach(async () => {
		await harness.close();
	});

	it('creates a player with trimmed name and default sync state', async () => {
		const player = await harness.repos.players.create({ name: '  Alice  ' });
		expect(player.name).toBe('Alice');
		expect(player.syncState).toBe('local');
		expect(player.deletedAt).toBeNull();
		expect(player.id).toMatch(/[0-9a-f-]+/);

		const fetched = await harness.repos.players.get(player.id);
		expect(fetched).toEqual(player);
	});

	it('rejects empty names', async () => {
		await expect(harness.repos.players.create({ name: '   ' })).rejects.toThrow(/name/);
	});

	it('updates a player and bumps updatedAt', async () => {
		const player = await harness.repos.players.create({ name: 'Bob' });
		await new Promise((r) => setTimeout(r, 5));
		const updated = await harness.repos.players.update(player.id, { color: '#f00' });
		expect(updated.color).toBe('#f00');
		expect(updated.updatedAt > player.updatedAt).toBe(true);
	});

	it('soft-deletes by setting deletedAt', async () => {
		const player = await harness.repos.players.create({ name: 'Carol' });
		await harness.repos.players.softDelete(player.id);
		const fetched = await harness.repos.players.get(player.id);
		expect(fetched?.deletedAt).not.toBeNull();
	});

	it('listActive excludes soft-deleted', async () => {
		const a = await harness.repos.players.create({ name: 'Alice' });
		await harness.repos.players.create({ name: 'Bob' });
		await harness.repos.players.softDelete(a.id);
		const active = await harness.repos.players.listActive();
		expect(active.map((p) => p.name)).toEqual(['Bob']);
	});

	it('listActive returns players sorted by name', async () => {
		await harness.repos.players.create({ name: 'Charlie' });
		await harness.repos.players.create({ name: 'Alice' });
		await harness.repos.players.create({ name: 'Bob' });
		const active = await harness.repos.players.listActive();
		expect(active.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
	});

	it('flips syncState from synced to pending on update', async () => {
		const player = await harness.repos.players.create({ name: 'Dan' });
		await harness.db.players.put({ ...player, syncState: 'synced', remoteId: 'remote-1' });
		const updated = await harness.repos.players.update(player.id, { name: 'Daniel' });
		expect(updated.syncState).toBe('pending');
	});
});
