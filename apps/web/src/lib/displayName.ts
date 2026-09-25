/**
 * The name the UI greets the person by: the name they gave on the
 * profile-setup screen / Account (Session 70), else the email's local part,
 * capitalized (the pre-Session-70 behavior, kept for accounts with no name).
 */
export function displayFirstName(profileFirstName: string | null | undefined, email: string | null | undefined): string {
  if (profileFirstName?.trim()) return profileFirstName.trim()
  const namePart = email?.split('@')[0] ?? ''
  return namePart.charAt(0).toUpperCase() + namePart.slice(1)
}
