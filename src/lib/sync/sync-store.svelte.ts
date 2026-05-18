import { SyncEngine, type SyncResult } from './engine';

export class SyncStore {
	#busy = $state(false);
	#error = $state<string | null>(null);
	#lastResult = $state<SyncResult | null>(null);

	constructor(private readonly engine: SyncEngine = SyncEngine.create()) {}

	get busy(): boolean {
		return this.#busy;
	}

	get error(): string | null {
		return this.#error;
	}

	get lastResult(): SyncResult | null {
		return this.#lastResult;
	}

	async syncNow(): Promise<void> {
		this.#busy = true;
		this.#error = null;
		try {
			this.#lastResult = await this.engine.syncNow();
		} catch (err) {
			this.#error = err instanceof Error ? err.message : String(err);
			throw err;
		} finally {
			this.#busy = false;
		}
	}
}

let singleton: SyncStore | null = null;

export function getSyncStore(): SyncStore {
	if (!singleton) singleton = new SyncStore();
	return singleton;
}
