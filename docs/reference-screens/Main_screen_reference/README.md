# Reference screens

These 8 PNGs are the source-of-truth reference requirement for each of
DPNR's 8 mocked screens — persisted, full-resolution (2880×1620) renders of
`docs/UI reference for platform.pdf`, one page per file, in the same order
the PDF itself uses.

| File | Screen | Live route |
|---|---|---|
| `01-main-chat.png` | Main Chat (Companion) | `/companion` |
| `02-dashboard.png` | Dashboard | `/dashboard` |
| `03-mirror-room.png` | Mirror Room | `/mirror/new` |
| `04-decision-room.png` | Decision Room | `/decision/new` |
| `05-content-learning.png` | Content & Learning | `/library` |
| `06-growth-tracker.png` | Growth Tracker | `/growth` |
| `07-my-evolution-map.png` | My Evolution Map | `/evolution-map` |
| `08-my-wallet.png` | My Wallet | `/wallet` |

**Use these as the visual requirement when reskinning, auditing, or
comparing a screen against the reference** — no need to re-render the PDF
for a routine check. `.claude/skills/mockup-to-code/` still documents how
to re-render fresh (`scripts/render_pages.py`) for the rare case this PDF
itself changes; if that ever happens, regenerate these 8 files the same
way and replace them here so this folder doesn't go stale against its own
source.

Generated 2026-09-09 (Session 42), via `pymupdf` at 2x scale, same method
`mockup-to-code`'s `render_pages.py` uses.
