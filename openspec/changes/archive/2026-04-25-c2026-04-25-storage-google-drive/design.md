## Context

DeporTeen currently supports media capture from match live views and stores media metadata in Supabase `match_media`. The current Google Drive integration is client-session based: it obtains a short-lived Google access token in the browser, stores it in `sessionStorage`, uploads directly from the client, and uses local IndexedDB as an immediate preview/cache path.

This has three important limitations:

- Google Drive reconnects are frequent because access tokens expire and no refresh token is persisted.
- The selected provider is currently a browser-local preference, not a durable account setting.
- When Drive media also has a local `device_uri`, the PWA can keep rendering a stale local copy even if the Drive file has been deleted or is no longer accessible.

The Supabase schema observed in the current environment does not include the older `profiles` table or `match_media.storage_provider` / `match_media.google_drive_file_id` columns. The implementation must therefore avoid relying on those legacy fields unless a migration explicitly adds stable replacements.

## Goals / Non-Goals

**Goals:**

- Persist Google Drive connection state using a server-side OAuth flow with refresh-token support.
- Persist each user's selected media storage provider in Supabase so it survives navigation, browser restarts, and device changes.
- Upload Drive-selected media through a server-controlled path that can refresh Google access tokens without exposing long-lived credentials to the client.
- Make Google Drive the source of truth for Drive media rendering: if the Drive file is deleted or inaccessible, the gallery must not silently fall back to a stale local blob.
- Preserve local storage behavior for the `local` provider, and preserve paid cloud/R2 behavior for users selecting the DeporTeen cloud provider.
- Provide clear connected, reconnect-required, and disconnected UI states in account storage settings.

**Non-Goals:**

- Replacing Cloudflare R2 or Supabase Storage as existing media storage options.
- Making Google Drive files appear in the phone's native photo gallery.
- Guaranteeing indefinite Drive access after the user revokes consent, changes Google security settings, or Google invalidates the refresh token.
- Implementing a full Google Drive file manager inside DeporTeen.
- Backfilling historical local-only media into Drive automatically.

## Decisions

### 1. Use server-side OAuth with offline access for Drive persistence

Implement Google Drive connection with Authorization Code Flow:

- `/api/google/drive/connect` starts OAuth with `access_type=offline`, `prompt=consent` when needed, and a CSRF `state`.
- `/api/google/drive/callback` exchanges the code for tokens and stores the refresh token server-side.
- `/api/google/drive/disconnect` revokes/removes the stored connection.
- `/api/google/drive/status` returns connection state to the account UI.

Rationale: browser-only `access_token` storage cannot provide durable Drive connectivity. Refresh tokens must not be stored in `sessionStorage`, `localStorage`, or client-visible state.

Alternatives considered:

- Keep using `sessionStorage`: simpler, but cannot satisfy durable connection requirements.
- Store Google tokens in client localStorage: persistent but unsafe and still exposed to XSS.
- Require user reconnection for every upload: secure enough, but poor UX and fails the requested persistence behavior.

### 2. Store provider preference in Supabase, not only localStorage

Add a durable per-user provider preference, preferably in a dedicated table such as `media_storage_preferences`:

- `user_id`
- `provider` (`local`, `drive`, `r2`, `supabase`)
- `updated_at`

The client hook `useStorageProvider` should read/write this preference through authenticated API routes or Supabase queries guarded by RLS.

Rationale: the preference is account state, not device state. It must survive navigation, browser restarts, and use from another device.

Alternatives considered:

- Add `media_provider` to `users`: fewer tables, but mixes account profile data with storage integration state.
- Use localStorage only: works within one browser but fails cross-device and can be cleared silently.

### 3. Store Drive media references explicitly and avoid stale local fallback for Drive media

Drive-uploaded media should store its Drive file ID in a durable Supabase field. Preferred model:

- Add `match_media.storage_provider` with values `local`, `drive`, `r2`, `supabase`.
- Add `match_media.google_drive_file_id` for Drive files.
- Keep `device_uri` only for local/offline preview and local-provider media.

Gallery resolution rules:

- `storage_provider = drive`: resolve via Drive file ID or a server proxy/check route; do not use `device_uri` as fallback after upload has succeeded.
- `storage_provider = local`: resolve from IndexedDB `device_uri`.
- `storage_provider = r2`: resolve from R2 public URL or signed/proxy route.
- `storage_provider = supabase`: resolve from Supabase Storage signed URL.

Rationale: provider-specific behavior becomes explicit and prevents a Drive file from appearing available just because a stale local blob remains in IndexedDB.

Alternative considered:

- Encode provider prefixes in `storage_path` (for example `drive:<fileId>`). This can be a transitional compatibility layer, but it is weaker than explicit typed columns and makes queries/usage accounting harder.

### 4. Upload Drive media through an authenticated server endpoint

For Drive-selected uploads, the live match page should submit the file to a DeporTeen API route such as `/api/google/drive/upload`. The route should:

- Verify the Supabase session.
- Verify the user owns the target match/player context.
- Refresh the Google access token from the stored refresh token.
- Upload the file to Drive.
- Optionally create/read permissions according to product policy.
- Insert `match_media` with `storage_provider = drive` and `google_drive_file_id`.

Rationale: this centralizes token refresh, ownership checks, and metadata persistence. It also avoids exposing refresh tokens and makes upload failures observable in server logs.

Alternatives considered:

- Direct client upload using temporary access token: fewer server resources, but connection still expires and upload behavior is harder to validate.
- Hybrid client upload plus server token refresh: more complex and still exposes short-lived credentials in the browser.

### 5. Treat moved Drive files as valid, deleted/inaccessible files as unavailable

Moving a Drive file between folders usually preserves the same `fileId`; the PWA should still show it if Drive confirms the file is accessible. Deleting the file, revoking permission, or losing token access should mark the media as unavailable in the gallery.

Implementation options:

- Use Drive URL directly for rendering but perform a lightweight availability check before showing a thumbnail.
- Or proxy thumbnail/media access through a server route that refreshes the token and returns 404/410 for inaccessible files.

The server-proxy approach is preferred for correctness and future privacy control, though direct URLs may be acceptable initially if paired with explicit error handling and no local Drive fallback.

## Risks / Trade-offs

- [Google refresh token is revoked or not issued] → Show reconnect-required state and provide a clear reconnect CTA.
- [OAuth app remains in Google testing mode] → Refresh tokens may expire sooner; production OAuth verification may be required before release.
- [Token storage introduces security risk] → Store refresh tokens server-side only, protect them from logs, and encrypt at rest or use a server-side secret encryption strategy.
- [Large video uploads through Next.js routes can hit runtime limits] → Use Node runtime, validate file size, and consider direct resumable upload architecture if route limits become a problem.
- [Drive files are moved] → Rely on `fileId`, not folder path; moving should not break rendering.
- [Drive files are deleted] → Do not fall back to IndexedDB for Drive media after successful upload; show unavailable state instead.
- [Existing rows lack provider metadata] → Migration must classify existing rows conservatively, defaulting to `local` when only `device_uri` exists and no cloud reference is present.
- [RLS/API ownership bugs could expose media] → All API routes must validate session and match ownership before upload, listing, update, or delete.

## Migration Plan

1. Add Supabase schema for persistent provider preference and Google Drive connection state.
2. Add or formalize `match_media.storage_provider` and `match_media.google_drive_file_id`; migrate existing media rows conservatively.
3. Implement Google OAuth connect/callback/status/disconnect API routes.
4. Implement server-side Drive upload/refresh helper and upload route.
5. Update account storage settings to read connection status and provider preference from server-backed state.
6. Update live media capture to route Drive uploads through the server endpoint.
7. Update gallery resolution so Drive media uses Drive availability as source of truth and does not fall back to local cache.
8. Add focused tests for provider persistence, Drive unavailable state, and upload metadata.

Rollback strategy:

- Keep local provider as default fallback.
- If Drive connection fails, keep existing local/R2 flows functional.
- Avoid deleting local blobs during migration until Drive behavior is verified.

## Open Questions

- Which Supabase migration path should be used for token encryption: database encryption extension, application-level encryption with an environment secret, or a managed secret store?
- Should Drive files be public-with-link, private with server proxy, or configurable? Private/proxy is safer but more server-intensive.
- What maximum file size should be accepted by the server upload endpoint for Drive videos?
- Should existing Drive-prefixed `storage_path` rows be migrated into explicit `google_drive_file_id`, or treated as temporary compatibility only?
