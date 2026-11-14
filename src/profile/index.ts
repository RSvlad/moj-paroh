import type reference from '../../profiles/paroh/profile.json';

// The words people read (UI texts, app name): profiles/paroh/profile.json ("парохија", "парохијски храм").
// The code itself says territory/capital internally; the published data uses the same neutral names.

/** Shape of every profile; profiles/paroh/profile.json is the reference (see profiles/README.md). */
export type Profile = typeof reference;
export type TextKey = keyof Profile['text'];

// Injected by vite.config.ts from the active profile (in unit tests always the default one).
declare const __PROFILE__: Profile;

export const profile: Profile = __PROFILE__;

/** Text of the profile with its {placeholders} filled: tr('territory.heading', { id, name }). */
export function tr(key: TextKey, vars: Record<string, string | number> = {}): string {
  return profile.text[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}
