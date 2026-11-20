// Section keys are 2 to 5 capital letters. The URL is case-insensitive, so lower case
// is accepted here and upper-cased when the section is looked up.
const SECTION_KEY_PATTERN = /^[A-Za-z]{2,5}$/;

/** Checks a section key taken from the URL before it is used for anything. */
export function isValidSectionKey(value: string): boolean {
  return SECTION_KEY_PATTERN.test(value);
}
