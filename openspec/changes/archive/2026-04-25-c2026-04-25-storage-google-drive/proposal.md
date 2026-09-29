## Why

Google Drive is currently treated as a short-lived browser session, so users must reconnect frequently and media can appear available in the PWA even after the Drive file is moved or deleted. This undermines trust in Google Drive as a storage option for match photos and videos.

## What Changes

- Add a durable Google Drive connection flow for authenticated users, using a server-side OAuth connection that can renew access without repeated manual reconnection.
- Persist the user's selected media storage provider so Google Drive remains selected across navigation and sessions.
- Ensure media uploaded to Google Drive is resolved from Drive as the source of truth rather than a stale local preview when the provider is Drive.
- Update gallery behavior so moved Drive files remain visible when the Drive file ID is still valid, while deleted or inaccessible Drive files no longer render as if available.
- Provide disconnect/error states for Google Drive so users understand when reconnection is required.
- Preserve existing local/offline and paid cloud storage behavior unless explicitly superseded by Google Drive selection.

## Capabilities

### New Capabilities

- `google-drive-media-storage`: Covers connecting Google Drive, uploading match photos/videos to Drive, resolving Drive media in galleries, and handling inaccessible/deleted Drive files.
- `media-storage-provider-preferences`: Covers selecting and persisting the default media storage provider per user across sessions.

### Modified Capabilities

- None.

## Impact

- Affected UI: account storage settings, match live media capture, match media gallery.
- Affected client logic: storage provider hook, Google Drive connection helpers, media upload/resolution utilities.
- Affected API/server logic: likely new Google OAuth callback/connect/disconnect routes and server-side Drive upload/token refresh routes.
- Affected data: persistent Google Drive connection state and selected storage provider will require Supabase-backed storage; tokens must be protected and never exposed to client logs.
- Affected integrations: Google OAuth/Drive API, existing IndexedDB local cache, Supabase `match_media`, and existing R2/Supabase storage fallbacks.
