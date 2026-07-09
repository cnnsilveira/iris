/**
 * WordPress user info localized into the page for the sidebar profile.
 *
 * @since v0.3.0
 */
export interface VitrusUser {
  /** Display name. */
  name: string;
  /** Avatar image URL. */
  avatarUrl: string;
  /** Capitalized primary role, e.g. "Administrator". */
  role: string;
}

/**
 * Settings localized from WordPress (window.vitrusSettings).
 *
 * @since v0.1.0
 */
export interface VitrusSettings {
  /** REST nonce. */
  nonce: string;
  /** Root URL for Vitrus REST endpoints. */
  restUrl: string;
  /** MD5 hash of the site URL for storage namespacing. */
  siteHash: string;
  /** True on the settings screen. */
  isSettingsPage: boolean;
  /** Current WordPress user (present on chat/settings screens). */
  currentUser?: VitrusUser;
}

declare global {
  interface Window {
    vitrusSettings?: VitrusSettings;
  }
}
