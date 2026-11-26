# Demo accounts (mock backend only)

The frontend runs against an in-memory mock backend (`src/api`). Everything below exists only
there and is reset by a page reload. The session is also kept in memory, so **a reload signs you
out**. None of this belongs in production.

## Password

Every seed account has the same password: `Tracker-Demo-2026`
(only its hash is in `src/api/mockAuthData.ts`).

## Accounts

| Email | Acme Studio | Globex Labs |
|---|---|---|
| `maria.koleva@acme.example` | Owner (every permission) | Member |
| `anton.nikolov@acme.example` | Co-admin | - |
| `stefan.borisov@acme.example` | People manager | - |
| `elena.petrova@acme.example` | Member | Owner |
| `daniela.filipova@acme.example` | Member | - |
| `ivan.georgiev@acme.example` | Member | - |

Generated filler people use the same password, for example `andrey.ivanov.0@globex.example` (Globex
only). Their emails follow `first.last.N@acme.example` / `@globex.example`.

## Things to try

- **Sign in** as Maria, then open *Workspace settings > Members*.
- **Invitation for a new account:** open `/invitations/demo-invite-daniel-hristov-7f3a`
  (a second one is `/invitations/demo-invite-ivan-stoyanov-1c9e`).
- **Invitation for an existing account:** as Maria, *Add user* with `andrey.ivanov.0@globex.example`.
  The mock shows the link in a dialog (development only). Open it signed out, sign in, and join.
- **Sign up** (`/sign-up`): the account cannot sign in until its email is confirmed. The mock has no mailbox: the confirmation page shows a development-only link, followed inside the app (never open mock links in a new tab: a reload erases the mock data).
- **No workspace yet:** a signed-in account without a workspace sees its invitations and can create a workspace (it gets the default roles and a first section, General).
- **Forgot password:** `/forgot-password`. The mock shows the reset link on the confirmation page
  (development only).
- **Lock-out:** five wrong passwords for one email lock it for 15 minutes.

## What production does differently

- Passwords are hashed with bcrypt or argon2; the mock uses a salted SHA-256 stand-in.
- Invitation and reset links are **emailed**; the API never returns them (the mock's `devLink` exists only so you can click through).
- The access token (JWT) stays in memory; the refresh token is an httpOnly cookie set by the backend, so a reload keeps you signed in.
- Sign-in attempts are also limited per IP address.
