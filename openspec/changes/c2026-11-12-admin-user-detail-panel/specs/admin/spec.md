## ADDED Requirements

### Requirement: Admin user detail view
The system SHALL expose `/admin/usuarios/[userId]` with tabs General, Suscripciones (including history), and Jugadores for users who pass `requireAdmin`.

#### Scenario: Read-only for non-superadmin panel user
- **WHEN** an admin authenticated via `ADMIN_EMAILS` without `users.role = Superadmin` opens the detail page
- **THEN** all tabs render in read-only mode with a banner indicating limited permissions
- **AND** mutation controls are hidden or disabled

#### Scenario: Superadmin mutations
- **WHEN** the actor has `public.users.role = Superadmin`
- **THEN** profile, subscription, and player admin actions are available
- **AND** corresponding API routes return 403 for non-superadmin callers

### Requirement: Subscription seat reduction
When reducing `subscriptions.seats`, the admin UI SHALL require unlinking linked players until `active_links <= new_seats` or rejecting the update.

#### Scenario: Occupied seats block blind reduction
- **WHEN** seats are reduced below the count of active `subscription_players` without selecting players to unlink
- **THEN** the API returns a validation error and no row is updated

### Requirement: Admin audit log
Subscription seat or period changes via admin PATCH SHALL insert a row in `admin_audit_log` with actor, target user, action, and JSON payload.
