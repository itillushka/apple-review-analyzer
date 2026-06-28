# Deployment

Review Atlas runs as two containers (`api` + `web`) behind the host's nginx + certbot
for TLS. No Traefik, no managed cloud — a plain Docker Compose stack on a single VPS.

## Architecture

```
Internet ──TLS──▶ host nginx + certbot ──▶ web container (nginx)
                                              ├─ serves the React SPA
                                              └─ /api/* ─▶ api container (uvicorn :8100)
```

## Prerequisites

- A VPS with Docker + Docker Compose and nginx + certbot installed.
- A domain/subdomain pointed at the server (for TLS).

## Steps

1. **Clone and configure**

   ```bash
   git clone https://github.com/itillushka/apple-review-analyzer.git
   cd apple-review-analyzer
   cp backend/.env.example backend/.env   # then fill in OPENROUTER_API_KEY etc.
   ```

2. **Build and run the stack**

   ```bash
   docker compose up -d --build         # api + web
   # backend only (before the frontend exists):
   docker compose up -d --build api
   ```

   - `web` is published on host port **8080**.
   - `api` is internal (reachable as `api:8100` from the web container).
   - The review cache persists in the `api-data` volume.

3. **TLS + reverse proxy (host nginx)**

   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/review-atlas
   sudo ln -s /etc/nginx/sites-available/review-atlas /etc/nginx/sites-enabled/
   # edit the server_name to your domain, then:
   sudo certbot --nginx -d your-domain.com
   sudo nginx -t && sudo systemctl reload nginx
   ```

   The host nginx terminates TLS and proxies to `127.0.0.1:8080` (the web container).

## Operations

```bash
docker compose logs -f api          # tail backend logs
docker compose restart api          # restart after a config change
docker compose pull && docker compose up -d --build   # update
curl https://your-domain.com/api/health                # smoke test
```

## Notes

- Secrets live in `backend/.env` (git-ignored) and are passed to the `api` container
  via `env_file`. They are never baked into the image.
- The backend image is built with `uv` from `uv.lock` for reproducible installs.
- LLM calls go to OpenRouter; without `OPENROUTER_API_KEY` the `/insights` and
  `/analyze` endpoints return an error (there is no offline fallback).
