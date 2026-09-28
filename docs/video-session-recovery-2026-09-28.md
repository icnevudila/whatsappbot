# Video session recovery verification — 2026-09-28

## Root cause and deployed changes

The signed-in `mesajify2` session was in `chromium-profile-3/Profile 1`,
not in the profile used by CDP 9225. The account was recovered to
`chromium-profile-4/Default`; the original source profile and destination
backup were retained. CDP 9224 remains assigned to `mesajify1`.

Video Chrome launches now explicitly select the configured profile directory
(Default unless overridden). Account verification waits for a hydrated email
and rejects an unexpected account before persisting configuration. A delayed
exit from an old browser cannot invalidate its replacement. Auth restore can
run while a job is reserved but before provider execution, remains bounded,
and cannot close a browser already generating or downloading. Shutdown waits
for CDP to disappear; external termination matches both the exact port and
profile directory. No image-generation implementation was changed.

## Live evidence

Both attempts stopped only the idle 9225 Chrome process after checking gateway
and Flow-engine work, then invoked the production `refresh-flow` recovery
endpoint. Neither attempt submitted a video-generation request.

| Check | Result |
| --- | --- |
| First 9225 stop/recovery, 14:04:38 UTC | Expected account authenticated; profile synced; 1020 credits |
| Latest deployed code, 9225 stop/recovery, 14:08:27 UTC | `authenticated=true`, `profileSynced=true`, 1020 credits from `flow_account_menu` |
| 9224 restored, 14:08:32 UTC | Expected `mesajify1` account authenticated; profile synced; 930 credits |
| Gemini video capability, both accounts | Not verified: `geminiReady=false`; positive video capability evidence absent |

This proves on-demand recovery of the existing persistent Google session after
browser termination. It does **not** prove fresh password login after explicit
Google logout, revoked sessions, CAPTCHA/2FA handling, spontaneous background
recovery without an incoming request, or an end-to-end paid video render.
No password-login automation was added and no credentials were added to source.

## Local verification

- Supervisor and account-recovery tests: 37/37 passed.
- JavaScript syntax and diff whitespace checks passed.
- The complete gateway suite has a separate failure in
  `test/orphan_tab_reaper.test.js:105`: duplicate idle ChatGPT tab classification
  retains two tabs instead of one. This test/module was not changed here.

Only the video session-validator hunk in the already-dirty `server.js` belongs
to this change; unrelated working-tree edits must not be included in its commit.
