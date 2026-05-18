export type PlayerStats = {
	playerId: string;
	matchesPlayed: number;
	matchesWon: number;
	legsWon: number;
	turnsPlayed: number;
	averageTurnScore: number;
	highestTurn: number;
	checkoutCount: number;
	checkoutAttempts: number;
	checkoutPercentage: number | null;
};

export type StatsSummary = {
	matchesPlayed: number;
	totalTurns: number;
	perPlayer: PlayerStats[];
};
