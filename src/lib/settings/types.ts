export const SETTINGS_KEYS = {
	deviceName: 'deviceName',
	lastSyncedAt: 'lastSyncedAt',
	turnEntryMode: 'turnEntryMode'
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export type TurnEntryMode = 'total' | 'per-dart';

export type AppSettings = {
	deviceName: string | null;
	lastSyncedAt: string | null;
	turnEntryMode: TurnEntryMode;
};

export const DEFAULT_SETTINGS: AppSettings = {
	deviceName: null,
	lastSyncedAt: null,
	turnEntryMode: 'total'
};
