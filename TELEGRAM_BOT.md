# OpenCode Telegram Bot — Setup & Operations Guide

Remote control of OpenCode from your phone via Telegram. Everything runs locally on this
machine: the Telegram bot polls the Telegram Bot API, talks to the local OpenCode server on
`127.0.0.1:4096`, and never exposes a port to the internet.

- Bot: `<bot-username>`
- Bot package: [`@grinev/opencode-telegram-bot`](https://github.com/grinev/opencode-telegram-bot) v0.26.5
- OpenCode server API: **V1** (`opencode serve`, installed at `~/.opencode/bin/opencode`, v1.18.31)
- Whitelisted Telegram user ID: `<your-telegram-user-id>`

> **Scope note.** This file documents *host-level* infrastructure, not the E-Commerce app code.
> It lives in this repo only because it was requested here — the bot has nothing to do with
> Next.js, Prisma or the storefront. Nothing in the app depends on it, and the bot's own config
> lives outside the repo in `~/.config/opencode-telegram-bot/`. Move or delete it freely.

---

## 0. Current state and handoff

**Status as of 2026-10-22: installed, configured, running — but not yet exercised end-to-end.**

| Check | Result |
| --- | --- |
| Node 22 installed at `~/.local/node` | done (v22.23.4) |
| Bot package installed globally | done (v0.26.5) |
| `~/.config/opencode-telegram-bot/.env` written (mode 600) | done |
| systemd user unit enabled + `linger` on | done |
| Bot authenticates with Telegram | done — log shows `Bot <bot-username> started!` |
| OpenCode server up on `127.0.0.1:4096` | done — bot auto-starts it |
| Health endpoint `127.0.0.1:3100/health` | done — reports `healthy` |
| **User pressed "Start" in the Telegram chat** | **not done — Telegram blocks bots from messaging users who never opened the chat** |
| **A real prompt sent and answered end-to-end** | **not done — depends on the previous item** |
| Second authorized user | not set up (single-user limitation, see §4) |

Open items for whoever picks this up:

1. Open `<bot-username>` in Telegram, press **Start**, then send a prompt. Confirm a reply arrives
   and that the OpenCode server shows a new session.
2. Decide whether the bot's default project should be this repo. Right now the bot starts in the
   home directory; use `/projects` → `E-Commerce` (already registered with OpenCode) or `/open`.
3. Decide whether a second authorized user is needed (§4).
4. Commit this file only if you want it in the repo history — it contains no secrets.

---

## 1. Architecture

```
Telegram app ──(HTTPS)──> api.telegram.org ──> opencode-telegram-bot (systemd user service)
                                                      │
                                                      └──(HTTP 127.0.0.1:4096)──> opencode serve
                                                                                   │
                                                                                   └──> your repos
```

The bot process is supervised by **systemd (user scope)** and starts the OpenCode server itself
(auto-restart + 300 s health check). `linger` is enabled, so both keep running with no active
SSH session.

| Component | Where |
| --- | --- |
| Bot service unit | `~/.config/systemd/user/opencode-telegram.service` |
| Bot config (`.env`) | `~/.config/opencode-telegram-bot/.env` |
| Bot runtime settings | `~/.config/opencode-telegram-bot/settings.json` |
| Bot logs (daily) | `~/.config/opencode-telegram-bot/logs/bot-YYYY-MM-DD.log` |
| Bot custom commands | `~/.config/opencode-telegram-bot/local-commands/*.json` |
| Bot health endpoint | `http://127.0.0.1:3100/health` |
| OpenCode server | `http://127.0.0.1:4096` (V1 API) |
| OpenCode config | `~/.config/opencode/opencode.jsonc` |
| Node.js runtime | `~/.local/node` (v22.23.4 — system Node is v16 and too old for the bot) |

---

## 2. Where the config lives

The bot reads `~/.config/opencode-telegram-bot/.env` at startup. **Never commit that file** — it
contains the bot token. It is already `chmod 600`.

Process environment variables take precedence over the `.env` file.

### Key variables

| Variable | Purpose | Current value |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather | *(secret — in `.env` only)* |
| `TELEGRAM_ALLOWED_USER_ID` | Numeric Telegram user ID allowed to use the bot | `<your-telegram-user-id>` |
| `OPENCODE_SERVER_VERSION` | Server API flavour: `v1` or `v2` | `v1` |
| `OPENCODE_API_URL` | OpenCode server URL (host:port, no `/api`) | `http://127.0.0.1:4096` |
| `OPENCODE_SERVER_USERNAME` / `OPENCODE_SERVER_PASSWORD` | Server auth (password is **required** for V2, optional for V1) | `opencode` / empty |
| `OPENCODE_AUTO_RESTART_ENABLED` | Bot starts/restarts the local OpenCode server | `true` |
| `OPENCODE_MONITOR_INTERVAL_SEC` | Health-check interval in seconds | `300` |
| `OPENCODE_MODEL_PROVIDER` / `OPENCODE_MODEL_ID` | Default model | `opencode` / `big-pickle` |
| `BOT_LOCALE` | Bot UI language (`en`, `de`, `fr`, `ru`, `zh`, …) | `en` |
| `BOT_HEALTH_PORT` | Health port on loopback (`0` disables) | `3100` |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error` | `info` |
| `TELEGRAM_PROXY_URL` / `TELEGRAM_API_ROOT` | Only if Telegram is blocked on your network | unset |

Full list of supported variables: see `README.md` in the bot's npm package
(`~/.local/node/lib/node_modules/@grinev/opencode-telegram-bot/README.md`).

### Changing the configuration

```bash
$EDITOR ~/.config/opencode-telegram-bot/.env
systemctl --user restart opencode-telegram
```

The interactive wizard is also available (needs a TTY):

```bash
~/.local/node/bin/opencode-telegram config
```

---

## 3. Managing the service

```bash
systemctl --user status  opencode-telegram          # status
systemctl --user restart opencode-telegram          # restart (after config changes)
systemctl --user stop    opencode-telegram          # stop
systemctl --user enable  opencode-telegram          # start automatically at boot
systemctl --user disable opencode-telegram          # do not start at boot

journalctl --user -u opencode-telegram -f           # live stdout/stderr
tail -f ~/.config/opencode-telegram-bot/logs/bot-$(date +%F).log
curl -s http://127.0.0.1:3100/health | python3 -m json.tool   # health status
```

The unit file (`~/.config/systemd/user/opencode-telegram.service`):

```ini
[Unit]
Description=OpenCode Telegram Bot
After=network-online.target

[Service]
Type=simple
ExecStart=%h/.local/node/bin/opencode-telegram start
Environment=NODE_ENV=production
Environment=PATH=%h/.local/node/bin:%h/.opencode/bin:/usr/local/bin:/usr/bin:/bin
WorkingDirectory=%h
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

Notes:

- Run in **foreground** mode under systemd (never `--daemon`).
- `PATH` must contain `~/.local/node/bin` (Node 22 + the `opencode-telegram` binary) and
  `~/.opencode/bin` (the `opencode` binary used by `/opencode_start`).
- `linger` is enabled (`loginctl enable-linger`), so the service survives logout.

### Gotcha: the bot's own CLI reports the wrong state

The package ships its own `opencode-telegram status | stop | start` commands. They only track the
built-in **daemon** mode (a PID file under `<appHome>/run/`). Because this setup runs under
systemd, those commands see no daemon state:

```bash
$ opencode-telegram status
Service status: stopped        # <- WRONG, the bot is actually running
```

**Use `systemctl --user status opencode-telegram` as the source of truth.** `opencode-telegram stop`
will not stop the systemd-managed bot either — it will just report that nothing is running.

### Upgrading the bot

```bash
~/.local/node/bin/npm install -g @grinev/opencode-telegram-bot@latest
systemctl --user restart opencode-telegram
tail -n 20 ~/.config/opencode-telegram-bot/logs/bot-$(date +%F).log   # confirm the new version
```

Upgrading can change `.env` defaults and behaviour — re-read the upstream README for new variables:
<https://github.com/grinev/opencode-telegram-bot>

### Uninstalling

```bash
systemctl --user disable --now opencode-telegram
rm ~/.config/systemd/user/opencode-telegram.service
systemctl --user daemon-reload
~/.local/node/bin/npm uninstall -g @grinev/opencode-telegram-bot
rm -rf ~/.config/opencode-telegram-bot        # removes config, logs, settings, local commands
loginctl disable-linger $(id -u)               # optional: only if nothing else needs it
```

---

## 4. Adding a second authorized user

**The bot supports exactly one authorized user.** `TELEGRAM_ALLOWED_USER_ID` is parsed as a single
integer and every update is filtered on `ctx.from.id === TELEGRAM_ALLOWED_USER_ID`; messages from
anyone else are silently ignored (and logged as unauthorized attempts). There is no comma-separated
list and no group-chat bypass — adding the bot to a group still only lets the whitelisted user
trigger it.

### Option A (recommended): a second bot instance

Give the new person their own bot token (via @BotFather) and run a second instance of the bot with
its own app home. The two instances share the same OpenCode server.

1. Create a second bot with @BotFather and get the new user's numeric ID from @userinfobot.

2. Create a second app home and config:

   ```bash
   mkdir -p ~/.config/opencode-telegram-bot-2/{logs,local-commands}
   cp ~/.config/opencode-telegram-bot/.env ~/.config/opencode-telegram-bot-2/.env
   $EDITOR ~/.config/opencode-telegram-bot-2/.env
   ```

   In that file set the **new** token and user ID, and adjust:

   ```env
   TELEGRAM_BOT_TOKEN=<second bot token>
   TELEGRAM_ALLOWED_USER_ID=<second user id>
   OPENCODE_AUTO_RESTART_ENABLED=false   # instance 1 already owns the server
   BOT_HEALTH_PORT=3101                  # avoid clashing with instance 1
   ```

3. Create `~/.config/systemd/user/opencode-telegram-2.service`:

   ```ini
   [Unit]
   Description=OpenCode Telegram Bot (second user)
   After=network-online.target

   [Service]
   Type=simple
   ExecStart=%h/.local/node/bin/opencode-telegram start
   Environment=OPENCODE_TELEGRAM_HOME=%h/.config/opencode-telegram-bot-2
   Environment=NODE_ENV=production
   Environment=PATH=%h/.local/node/bin:%h/.opencode/bin:/usr/local/bin:/usr/bin:/bin
   WorkingDirectory=%h
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=default.target
   ```

   `OPENCODE_TELEGRAM_HOME` moves the whole runtime (config, settings, logs, local commands) to
   another directory. `OPENCODE_API_URL` stays the same, so both instances drive one OpenCode server.

4. Start it:

   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now opencode-telegram-2.service
   ```

Caveats: two bots polling **different** tokens is fine — two bots polling the **same** token is
not (Telegram returns `409 Conflict` and updates get split between them). Also avoid letting both
instances drive the *same* OpenCode session at the same time; give each user their own session
(`/new`) or their own project.

### Option B: rotate the single whitelist user

To hand the bot over to somebody else, change `TELEGRAM_ALLOWED_USER_ID` in the `.env` and
restart the service. The previous user is locked out immediately.

---

## 5. Adding custom actions

There are three ways to add custom commands.

### A. Local JSON commands — your own slash commands that run shell scripts

Drop one JSON file per command in `~/.config/opencode-telegram-bot/local-commands/`. The filename
becomes the Telegram command (`quota.json` → `/quota`) and shows up in Telegram's command menu
after the bot restarts.

`~/.config/opencode-telegram-bot/local-commands/quota.json`:

```json
{
  "description": "Show provider quota limits",
  "exec": "node $HOME/bin/quota.js",
  "allowWhenBusy": true
}
```

(The command runs via `/bin/sh -c` with the bot's inherited environment, so `$HOME` expands to the
bot user's home directory. The app home is the working directory, so a relative path like
`./scripts/check.sh` also resolves against `~/.config/opencode-telegram-bot/`.)

Rules (enforced by the bot):

- Filename must match `^[a-z0-9_]{1,32}$` (lowercase letters, digits, underscore) and end in `.json`.
- The name must not collide with a built-in command (`/status`, `/new`, `/help`, …).
- `description` — required, single line, max 256 characters.
- `exec` — required shell command, run with `/bin/sh -c`.
- `allowWhenBusy` — optional boolean, default `false`. When `true` the command may run while the
  agent is working.
- Unknown extra fields are ignored.

Runtime behaviour:

- Working directory is the app home (`~/.config/opencode-telegram-bot/`), environment is inherited.
- Hard timeout of **30 s**; stdout is truncated at 4096 chars, stderr keeps the last 1024 chars.
- The command receives no Telegram text and no attachments, and never calls OpenCode.
- Local commands are **not** listed in `/help` or `/commands` — only in Telegram's command menu.
- Built-in Telegram commands registered by this bot are defined in `bot/commands/definitions.js` (see
  `/help` for the live list). A local JSON command that collides with a built-in name is rejected.

Reload after adding a file:

```bash
systemctl --user restart opencode-telegram
tail -f ~/.config/opencode-telegram-bot/logs/bot-$(date +%F).log   # "Loaded N command(s)"
```

### B. OpenCode custom commands — prompt templates run by the agent

These are OpenCode-side markdown files and appear in the bot's `/commands` menu.

- Global: `~/.config/opencode/commands/<name>.md` (this OpenCode version also accepts `command/`)
- Per project: `<project>/.opencode/commands/<name>.md`

`~/.config/opencode/commands/review.md`:

```markdown
---
description: Review the current diff
agent: plan
model: opencode/big-pickle
---

Review the uncommitted changes in this repository.
Recent commits:

!`git log --oneline -10`

Focus on correctness and regressions.
```

- `$ARGUMENTS`, `$1`, `$2`, … are substituted with the arguments typed after the command.
- `!`command`` injects shell output into the prompt.
- `@src/file.ts` includes a file in the prompt.
- Frontmatter: `description` (required), `agent`, `model`, `subtask`.

Run them from Telegram via `/commands` → pick one.

### C. Skills — reusable instruction sets

- Global: `~/.config/opencode/skills/<name>/SKILL.md`
- Per project: `<project>/.opencode/skills/<name>/SKILL.md`

`~/.config/opencode/skills/git-release/SKILL.md`:

```markdown
---
name: git-release
description: Draft release notes and a version bump from merged PRs
metadata:
  opencode/slash: "true"
---

## What I do
- Draft release notes from merged PRs
- Propose a version bump
```

Browse and run them from Telegram with `/skills`. Set `metadata["opencode/slash"] = "true"` to
expose a skill as a slash command in the TUI as well.

### D. MCP servers

Run `/mcps` in the chat to browse the configured MCP servers and toggle them on/off. Configure them
in `~/.config/opencode/opencode.jsonc` under the `mcp` key.

---

## 6. Daily usage

| Command | What it does |
| --- | --- |
| `/status` | Bot version, server health, project, session, model |
| `/new` | New session |
| `/projects` | Switch project (your repos are already registered) |
| `/open` | Add a project by browsing directories |
| `/worktree` | Switch between git worktrees of the current repo |
| `/sessions`, `/recent` | Browse and resume sessions |
| `/messages` | Browse user messages, revert or fork |
| `/abort` | Stop the running task |
| `/detach` | Leave the session running, stop tracking it |
| `/ls` | Browse/download files inside the project |
| `/settings` | Runtime preferences (streaming, compact output, TTS, queue) |
| `/commands`, `/skills`, `/mcps` | Custom commands, skills, MCP servers |
| `/task`, `/tasklist` | Scheduled tasks |
| `/opencode_start`, `/opencode_stop` | Start/stop the local OpenCode server |
| `/reload` | Reload the OpenCode configuration (V2 only) |
| `/help` | Command list |

Any other text message is sent to the agent as a prompt (while no blocking interaction is active).

### Sharing a session with the local TUI

The bot and the terminal UI talk to the same OpenCode server, but they do **not** share sessions
automatically. To let the bot follow a session you are running in the terminal, start the CLI
against the same server:

```bash
opencode --port 4096                       # single TUI on the bot's port
# or, with a shared backend:
opencode serve --port 4096                 # server
opencode attach http://127.0.0.1:4096       # TUI clients attach to it
```

Then pick the same session in Telegram (`/sessions` or `/recent`) — the bot starts tracking it and
shows live progress.

---

## 7. Verifying the setup

Run this checklist after any change (or when handing this over):

```bash
# 1. service is up
systemctl --user is-active opencode-telegram          # expect: active

# 2. bot process + opencode server as children of the service
systemctl --user status opencode-telegram | grep -A3 CGroup

# 3. bot health (opencode reachability included)
curl -s http://127.0.0.1:3100/health
# expect: {"status":"healthy", ... "checks":{"process":{"healthy":true},"opencode":{"healthy":true}}}

# 4. opencode server
curl -s http://127.0.0.1:4096/global/health          # expect: {"healthy":true,"version":"1.18.31"}

# 5. telegram token is valid
curl -s "https://api.telegram.org/bot<TOKEN_FROM_ENV_FILE>/getMe"
# expect: {"ok":true,"result":{"username":"<bot-username>", ...}}

# 6. recent log lines, no errors
tail -n 30 ~/.config/opencode-telegram-bot/logs/bot-$(date +%F).log
```

The one thing the checklist cannot verify is a real reply in Telegram — that needs a human to
press **Start** in the chat and send a prompt.

---

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Bot does not reply | Open the chat and press **Start** once — Telegram blocks bots from messaging users who never started the chat |
| `Unauthorized access attempt from user ID: …` in the log | That user is not the whitelisted ID (see §4) |
| Bot cannot reach `api.telegram.org` | Set `TELEGRAM_PROXY_URL` (forward proxy) or `TELEGRAM_API_ROOT` (your own reverse proxy); add `TELEGRAM_FORCE_IPV4=true` if IPv6 is broken |
| "OpenCode server is not running" | `systemctl --user restart opencode-telegram` — the bot starts the server itself; check `journalctl --user -u opencode-telegram -f` |
| `chat not found` when sending via the Bot API | The user has not started the chat with the bot |
| Bot version too old | `~/.local/node/bin/npm install -g @grinev/opencode-telegram-bot@latest` then restart the service |
| Node version error at startup | The bot needs Node ≥ 22.14; use `~/.local/node/bin/node` (the unit's `PATH` handles this) |

---

## 9. Security notes

- The bot token lives only in `~/.config/opencode-telegram-bot/.env` (mode `600`). It is **not** in
  this document and must not be committed to git.
- Only the whitelisted Telegram user ID can interact with the bot; all other traffic is dropped.
- The bot binds its health endpoint to `127.0.0.1` only; no port is exposed externally.
- The OpenCode server listens on `127.0.0.1:4096` and is unauthenticated on V1 — reachable only
  from this machine.
- `local-commands/*.json` are executed with the bot's OS permissions and inherited environment.
  Treat every file in that directory as trusted code.
- If this repository is ever shared publicly, rotate the bot token with @BotFather (`/revoke`) and
  update the `.env`.
