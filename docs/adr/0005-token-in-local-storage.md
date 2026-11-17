# 0005. Keep the web login session in `localStorage`

| Field  | Value      |
| ------ | ---------- |
| Status | Accepted   |
| Date   | 2026-11-17 |

## Context

The web app signs in with `POST /auth/login` and receives an access token that expires after 12
hours. Version 1 has no refresh token ([API](../API.md) section 1.1). The token has to live
somewhere in the browser so the user stays signed in across page reloads.

The system is a single-owner thesis project. It runs on a local network, serves a small number of
known users, and the frontend and the API run on different ports during development, so a
cookie would need cross-origin configuration. Several people may look at the dashboard on a
shared screen during the demo, and a reload or a browser restart should not log them out
mid-demo.

## Decision

- The session (`accessToken`, `user`, `expiresAt`) is stored as JSON in `localStorage` under the
  key `nutrify.session`.
- The token is sent as `Authorization: Bearer <token>`. For `<img>` requests, which cannot set
  headers, the API also accepts `?token=` ([API](../API.md) section 1.1).
- The session is read on startup and discarded when `expiresAt` has passed or when the API
  answers `401`. Signing out clears it together with the query cache.
- Every storage call is wrapped in `try` and `catch`. When storage is blocked (private mode),
  the session lives in memory only and the user signs in again after a reload.
- Device API keys are separate from user tokens and are never stored in the browser.

## Consequences

- The user stays signed in across reloads, tabs, and browser restarts until the token expires.
- Any script that runs on the page can read `localStorage`. A cross-site scripting flaw would
  expose the token. This is the main risk, and it is limited by: React escaping output, no
  third-party scripts on the pages, a 12-hour expiry, and role checks on the server.
- A token in a URL (`?token=`) can end up in server logs and browser history. Use it only for
  images and the video stream, and keep access logs private.
- The token cannot be revoked before it expires, because there is no refresh or session table.
  Changing the password does not end other sessions.
- If the system is ever deployed on the public internet, revisit this decision: move to an
  `HttpOnly` cookie with a refresh token, a Content Security Policy, and HTTPS. That change
  needs a new ADR that supersedes this one.

## Alternatives considered

| Option                                | Why not                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| In memory only                        | Safest against script access, but every reload signs the user out, which is poor for a monitoring screen                         |
| `sessionStorage`                      | Lost when the tab closes and not shared between tabs; the same script-access risk as `localStorage`                              |
| `HttpOnly` cookie                     | Better against script theft, but needs CSRF protection, cross-origin settings, and HTTPS to be safe; too much for a local system |
| Refresh token with short access token | The right answer for a public deployment; extra endpoints and storage that version 1 does not need                               |
