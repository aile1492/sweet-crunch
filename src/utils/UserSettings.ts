export interface AppSettings {
  vibrationEnabled: boolean;
  reducedMotion: boolean;
}

const STORAGE_KEY = 'sweet_crunch_settings';

const getSystemReducedMotion = (): boolean => {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
};

const defaultSettings = (): AppSettings => ({
  vibrationEnabled: true,
  reducedMotion: getSystemReducedMotion(),
});

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      vibrationEnabled: parsed.vibrationEnabled ?? true,
      reducedMotion: parsed.reducedMotion ?? getSystemReducedMotion(),
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures on locked-down browsers.
  }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...patch };
  saveSettings(next);
  return next;
}

export function isReducedMotionEnabled(): boolean {
  return loadSettings().reducedMotion;
}

export function isVibrationEnabled(): boolean {
  return loadSettings().vibrationEnabled;
}

export function toggleReducedMotion(): boolean {
  return updateSettings({ reducedMotion: !isReducedMotionEnabled() }).reducedMotion;
}

export function toggleVibration(): boolean {
  return updateSettings({ vibrationEnabled: !isVibrationEnabled() }).vibrationEnabled;
}

export function setReducedMotion(enabled: boolean): void {
  updateSettings({ reducedMotion: enabled });
}

export function setVibrationEnabled(enabled: boolean): void {
  updateSettings({ vibrationEnabled: enabled });
}

export function getMotionFactor(): number {
  return isReducedMotionEnabled() ? 0.55 : 1;
}

export function pulseVibration(pattern: number | number[]): void {
  if (!isVibrationEnabled()) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported environments.
  }
}

export function vibrateTap(): void {
  pulseVibration(14);
}

export function vibrateSpecial(): void {
  pulseVibration([18, 24, 24]);
}

export function vibrateCelebrate(): void {
  pulseVibration([24, 28, 30, 36]);
}

export const PRIVACY_POLICY_LINES = [
  'Sweet Crunch stores only local progress on your device.',
  'We save unlocked levels, scores, stars, booster counts, and settings so the bakery feels consistent when you come back.',
  'No account, cloud profile, or personal identity data is required to play this build.',
  'If ads or analytics are added in a future release, this screen should be updated before launch.',
];
