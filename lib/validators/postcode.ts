/**
 * Checks whether a string contains a valid UK postcode.
 * Matches with or without a space: "S43 3BA" or "S433BA".
 */
export function isValidUKPostcode(address: string): boolean {
  const postcodeRegex = /[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/i
  return postcodeRegex.test(address.trim())
}
