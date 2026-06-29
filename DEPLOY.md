# Deployment

Review Atlas runs as two containers (`api` + `web`) behind the host's nginx + certbot
for TLS. No Traefik, no managed cloud — a plain Docker Compose stack on a single VPS,
designed to sit **alongside** other apps already on the box.

## Architecture

```
Internet ──TLS──▶ host nginx + certbot ──▶ web container (nginx, 127.0.0.1:8180)
                                              ├─ serves the React SPA
                                              └─ /api/* ─▶ api container (uvicorn :8100)
```

The web container binds to **127.0.0.1:8180** (localhost only) so it is never exposed
directly — only the host nginx reaches it. Port 8180 avoids other stacks on the box.

## Prerequisites

- A VPS with Docker + Docker Compose, nginx, and certbot installed.
- A subdomain pointing **directly** at the server (A record, not proxied) so the
  Let's Encrypt HTTP-01 challenge reaches the host nginx.

## Steps

1. **Clone and configure**

   ```bash
   git clone https://github.com/itillushka/apple-review-analyzer.git ~/review-atlas
   cd ~/review-atlas
   cp backend/.env.example backend/.env   # then fill in OPENROUTER_API_KEY etc.
   # Public demo? set an access token to gate the API + site:
   #   echo "ACCESS_TOKEN=<your-shared-token>" >> backend/.env
   ```

2. **Build and run the stack**

   ```bash
   docker compose up -d --build         # api + web
   ```

   - `web` is published on **127.0.0.1:8180** (localhost only).
   - `api` is internal (reachable as `api:8100` from the web container).
   - The review cache persists in the `api-data` volume.

3. **TLS + reverse proxy (host nginx)**

   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/obrio
   sudo ln -sf /etc/nginx/sites-available/obrio /etc/nginx/sites-enabled/obrio
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d obrio.teriffic.xyz     # injects the 443 block + redirect
   ```

   The host nginx terminates TLS and proxies to `127.0.0.1:8180` (the web container).
   This site file only adds the `obrio.teriffic.xyz` server block; other sites are
   untouched.

## Operations

```bash
docker compose logs -f api          # tail backend logs
docker compose restart api          # restart after a config change
git pull && docker compose up -d --build   # update to latest
curl https://obrio.teriffic.xyz/api/health  # smoke test
```

## Notes

- Secrets live in `backend/.env` (git-ignored) and are passed to the `api` container
  via `env_file`. They are never baked into the image. Copy `.env` to the server
  out-of-band (e.g. `scp`), since it is not in git.
- `ACCESS_TOKEN`, when set, gates every data endpoint behind an `X-Access-Token`
  header; the site shows a token screen and remembers it per browser. Leave it unset
  for a fully open instance.
- The backend image is built with `uv` from `uv.lock` for reproducible installs.
- LLM calls go to OpenRouter; without `OPENROUTER_API_KEY` the `/insights` and
  `/analyze` endpoints return an error (there is no offline fallback).
```
