import type { SectionSettingsData } from '../../types';

/** Lets a tab update the page's settings data with what the API returned after a write. */
export type PatchSettingsData = (update: (data: SectionSettingsData) => SectionSettingsData) => void;
