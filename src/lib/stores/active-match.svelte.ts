import { MatchSession, type StartSessionInput } from '$lib/match/session';
import { createRepositories, type Repositories } from '$lib/db/repositories';
import type { ActiveMatchState } from '$lib/game/match-controller';
import type { PlayTurnInput } from '$lib/game/match-controller';

export class ActiveMatchStore {
	#session: MatchSession | null = null;
	#snapshot = $state<ActiveMatchState | null>(null);
	#busy = $state(false);
	#error = $state<string | null>(null);

	constructor(private readonly repos: Repositories = createRepositories()) {}

	get snapshot(): ActiveMatchState | null {
		return this.#snapshot;
	}

	get busy(): boolean {
		return this.#busy;
	}

	get error(): string | null {
		return this.#error;
	}

	get hasMatch(): boolean {
		return this.#session !== null;
	}

	async start(input: StartSessionInput): Promise<void> {
		await this.#run(async () => {
			this.#session = await MatchSession.start(this.repos, input);
			this.#snapshot = this.#session.state;
		});
	}

	async playTurn(input: PlayTurnInput): Promise<void> {
		const session = this.#requireSession();
		await this.#run(async () => {
			const next = await session.playTurn(input);
			this.#snapshot = next;
		});
	}

	async undoLast(): Promise<void> {
		const session = this.#requireSession();
		await this.#run(async () => {
			const next = await session.undoLast();
			this.#snapshot = next;
		});
	}

	clear(): void {
		this.#session = null;
		this.#snapshot = null;
		this.#error = null;
	}

	#requireSession(): MatchSession {
		if (!this.#session) throw new Error('no active match session');
		return this.#session;
	}

	async #run(op: () => Promise<void>): Promise<void> {
		this.#busy = true;
		this.#error = null;
		try {
			await op();
		} catch (err) {
			this.#error = err instanceof Error ? err.message : String(err);
			throw err;
		} finally {
			this.#busy = false;
		}
	}
}

let singleton: ActiveMatchStore | null = null;

export function getActiveMatchStore(): ActiveMatchStore {
	if (!singleton) singleton = new ActiveMatchStore();
	return singleton;
}
