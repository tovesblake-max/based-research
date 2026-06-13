# Meta Ads CLI — Setup Notes

The official Meta Ads CLI (`meta-ads` on PyPI, binary `meta`) was released by Meta on 2026-04-29 as part of the Ads AI Connectors open beta. It wraps the Meta Marketing API for terminal use and AI-agent workflows.

Docs: <https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-cli/ads-cli-overview>
Announcement: <https://developers.facebook.com/blog/post/2026/04/29/introducing-ads-cli/>

---

## What's installed

- **Package:** `meta-ads` v1.0.1 (official Meta release)
- **Install method:** isolated `uv tool install` with managed Python 3.12
- **Binary path:** `~/.local/bin/meta`
- **Bundled Python SDK:** `facebook-business==25.0.1` (the official Meta Marketing API client)

To upgrade later: `uv tool upgrade meta-ads`
To uninstall: `uv tool uninstall meta-ads`

---

## Auth — what the operator needs to do (one-time)

The CLI reads an access token from the `ACCESS_TOKEN` env var. There's no built-in OAuth flow, so the token is generated once in Meta Business Manager and pasted into a shell config.

### Step 1 — Generate a System User access token

Use a System User token (not a personal token) — long-lived, no rotation, scoped to the ad account.

1. Go to <https://business.facebook.com/settings/system-users>
2. Pick the Based Research business → **Add** a new System User
   - Name: `meta-ads-cli`
   - Role: **Admin** (needs admin to read everything; Employee is enough if read-only is the goal)
3. After it's created, click **Add Assets** → assign the Based Research **ad account** with full control, plus the Facebook **Page** if you want page-level commands to work
4. Click **Generate New Token**
   - App: pick or create a Meta Developer app under your Business
   - Scopes to enable:
     - `ads_management` (read + write campaigns/ads/etc)
     - `ads_read` (read insights — required even if you also have ads_management)
     - `business_management` (list ad accounts, manage assets)
     - `catalog_management` (only if you want to sync the Based Research product catalog — Phase 2 only)
     - `pages_show_list` and `pages_read_engagement` (only if managing Page commands)
   - Token expiration: **Never**
5. Copy the token. It only shows once.

### Step 2 — Find the ad account ID

In Business Manager → Ad Accounts → click the ad account → the URL contains `act_<DIGITS>`. Or run `meta ads adaccount list` after Step 3 and grab the right one.

### Step 3 — Add to shell config

Append to `~/.zshrc` (or `~/.zshenv` if the operator prefers it on every shell, including non-interactive):

```bash
# Meta Ads CLI auth
export ACCESS_TOKEN="EAAG…"          # paste the System User token from Step 1
export AD_ACCOUNT_ID="act_123456"    # the Based Research ad account from Step 2
# Optional, only needed for catalog/dataset/business-scoped commands:
# export BUSINESS_ID="123456789"
```

Then reload: `source ~/.zshrc`

> **Don't commit these to the repo.** `.env.local` patterns work too — `meta` reads from a `.env` file in the working directory if present (it bundles `python-dotenv`), so a project-scoped `.env` with these three vars also works and stays out of git.

### Step 4 — Verify

```bash
meta auth status                     # should print "Authenticated"
meta ads adaccount list              # should show the Based Research ad account
meta ads adaccount current           # confirms the AD_ACCOUNT_ID is set right
meta ads campaign list               # lists current campaigns
```

If any of those fail, the most likely causes are:
- Token doesn't have `ads_read` scope → add it and regenerate
- System User wasn't assigned the ad account asset → revisit Step 1.3
- `act_` prefix missing from `AD_ACCOUNT_ID` → Meta requires the prefix

---

## Useful read-only commands (safe to run any time)

```bash
# Last 7 days of performance, table format
meta ads insights get --date-preset last_7d

# Last 30 days, JSON output (for piping to jq / saving)
meta ads insights get --date-preset last_30d --output json > insights.json

# All campaigns, regardless of status
meta ads campaign list

# Single campaign detail
meta ads campaign get 12345

# Ad sets under a campaign
meta ads adset list --campaign-id 12345

# Creatives in the account
meta ads creative list

# Page list (requires pages_show_list scope)
meta ads page list
```

The `-o table|json|plain` flag works on every command. `--debug` adds API call logs when something doesn't behave.

---

## Write commands — be careful

These can affect billing or live ad delivery:

```bash
meta ads campaign create --name "Test" --objective OUTCOME_SALES --daily-budget 5000
meta ads campaign delete 12345
meta ads adset create ...
meta ads ad update ...
```

A cron-mode safety pattern for scripts:

```bash
meta ads campaign list --output json --no-input --no-color
```

`--no-input` disables interactive confirms (good for scripts), `--no-color` strips ANSI codes (good for log files), `--output json` is parseable.

---

## Using it with Claude Code or another AI agent

The CLI is the **agent-facing version** of Meta's AI Connectors — it's designed to be invoked from inside an AI session. Two ways to wire it up:

1. **Bash tool access** — any agent that can run shell commands can already use it. Ask the agent to "show me last week's Meta ad performance" and it'll run `meta ads insights get --date-preset last_7d` on its own.
2. **Meta Ads MCP server** — Meta also released an MCP server companion (separate from this CLI) for agents that prefer structured tools over shell. If we wire that into Claude Code's MCP config later, the operator's agents get typed tool calls instead of bash invocations. Not set up yet — the CLI is enough for now.

---

## Where the auth lives — security notes

- `ACCESS_TOKEN` is a long-lived System User token. Treat it like a database password.
- Don't put it in `~/.zshrc` if the operator commits dotfiles publicly. `~/.zshenv` (gitignored or non-synced) is safer.
- A project-scoped `.env` in the repo's working directory is fine — `meta` picks it up automatically — as long as `.env` is gitignored (it already is in this repo).
- To rotate: generate a new token in Business Settings, paste over, source the rc file again. The old one can be revoked from the same UI.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Not authenticated` | `ACCESS_TOKEN` not exported in current shell |
| `(#100) Tried accessing nonexisting field` | Token missing required scope — regenerate with `ads_read` + `ads_management` |
| `(#200) Permissions error` | System User not assigned the ad account asset |
| `Invalid ad account` | Missing `act_` prefix on `AD_ACCOUNT_ID` |
| Commands hang | Hit an interactive prompt — add `--no-input` to scripts |
