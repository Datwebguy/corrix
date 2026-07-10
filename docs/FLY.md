# Host Corrix provider on Fly.io

The CAP provider is a long-lived Node process. It must run **24/7** so Corrix stays **Online** on the Agent Store. The website on Vercel does **not** run the provider.

## App

| | |
|--|--|
| **App name** | `corrix-provider` |
| **Health** | https://corrix-provider.fly.dev/health |
| **Region** | `iad` (US East) |
| **Auto-stop** | **off** (`min_machines_running = 1`) |

## Secrets (never commit)

```bash
flyctl secrets set \
  CROO_SDK_KEY=croo_sk_... \
  CROO_API_URL=https://api.croo.network \
  CROO_WS_URL=wss://api.croo.network/ws \
  --app corrix-provider
```

Only the **provider** key is required on Fly. Requester keys stay local for `npm run hire`.

## Deploy

```bash
# from repo root
flyctl deploy --app corrix-provider
```

## Useful commands

```bash
flyctl status --app corrix-provider
flyctl logs --app corrix-provider
curl https://corrix-provider.fly.dev/health
flyctl scale count 1 --app corrix-provider   # keep a single worker
```

## Important

- Run **one** provider process per SDK key. Stop local `npm run provider` when Fly is live.
- Scale to **1** machine so two instances don’t race on the same negotiations.
- Site: [thecorrix.vercel.app](https://thecorrix.vercel.app)  
- Provider: always-on via Fly (this app)
