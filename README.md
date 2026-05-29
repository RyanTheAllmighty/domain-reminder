# Domain Reminder (Telegram)

A Bun-based CLI that runs well in Docker/Unraid and sends Telegram notifications when configured domains are close to expiry.

On container startup it checks every configured domain and sends a Telegram summary showing the service is running plus the current status of each domain. After that it checks once per day at the configured time.

## Environment variables

Required:

- `DOMAINS` (comma-separated list of domains, e.g. `example.com,example.net`)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional:

- `CHECK_TIME` (default `00:00`, 24-hour `HH:mm`, interpreted in the container timezone)
- `NOTIFY_THRESHOLDS_DAYS` (default `30,14,7`)
- `DATA_DIR` (default `/data`)
- `LOG_LEVEL` (`debug|info|warn|error`, default `info`)
- `TZ` (set by Docker/Unraid if you want a specific timezone, e.g. `Australia/Sydney`)

## How reminders work

For each domain, the app looks up the expiry date and registrar using RDAP first, then falls back to WHOIS if RDAP cannot provide an expiry date.

Thresholds are matched to the nearest configured threshold that still covers the domain. With the default `30,14,7` thresholds:

- 30 days remaining sends the 30-day reminder
- 13 days remaining sends the 14-day reminder
- 6 days remaining sends the 7-day reminder

Each threshold is sent once per domain per expiry date. State is stored in `DATA_DIR/state.json`, so mount `/data` in Docker/Unraid to avoid duplicate reminders after restarts.

## Create a Telegram bot + get your chat id

### 1) Create the bot

- In Telegram, open a chat with `@BotFather`
- Send `/newbot`
- Follow the prompts
- BotFather will give you a token that looks like `123456789:AA...`
- Set this as `TELEGRAM_BOT_TOKEN`

### 2) Get `TELEGRAM_CHAT_ID`

Send any message to your bot, then fetch updates:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates"
```

Look for `chat.id` in the response. Group chat IDs are often negative numbers.

## Run locally

Install deps:

```bash
bun install
```

Create your env file:

```bash
copy .env.example .env
```

Edit `.env` and fill in the required values, then run:

```bash
bun run start
```

## Run with Docker (Unraid-friendly)

Build:

```bash
docker build -t domain-reminder .
```

Run:

```bash
docker run --rm \
  -e DOMAINS="example.com,example.net" \
  -e TELEGRAM_BOT_TOKEN="123:abc" \
  -e TELEGRAM_CHAT_ID="123456789" \
  -e CHECK_TIME="00:00" \
  -e NOTIFY_THRESHOLDS_DAYS="30,14,7" \
  -e TZ="Australia/Sydney" \
  -e DATA_DIR="/data" \
  -v domain-reminder-data:/data \
  domain-reminder
```

Notes:

- The startup Telegram summary is informational and does not consume reminder thresholds.
- Normal reminder dedupe is persisted in `/data/state.json`.
- The published GitHub package image will be available from `ghcr.io/<owner>/<repo>`.
