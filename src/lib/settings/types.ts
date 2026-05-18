export const SETTINGS_KEYS = {
	deviceName: 'deviceName',
	lastSyncedAt: 'lastSyncedAt'
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export type AppSettings = {
	deviceName: string | null;
	lastSyncedAt: string | null;
};

export const DEFAULT_SETTINGS: AppSettings = {
	deviceName: null,
	lastSyncedAt: null
};
