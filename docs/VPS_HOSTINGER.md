# Hostinger VPS — `satsang.dhyeyapurti.in`

Self-host the Next.js app on your Hostinger VPS so the existing site on that server stays untouched.

## Current target

| Item | Value |
| --- | --- |
| Public URL | `https://satsang.dhyeyapurti.in` |
| VPS IP | `187.127.155.21` |
| App port (local) | `43123` |
| DNS | GoDaddy A record `satsang` → `187.127.155.21` |

## 1. DNS (done when dig shows the VPS IP)

In GoDaddy → DNS for `dhyeyapurti.in`:

- Type: **A**
- Name: **satsang**
- Value: **187.127.155.21**
- TTL: 600 (or default)

Verify:

```bash
dig +short satsang.dhyeyapurti.in
# expect: 187.127.155.21
```

## 2. Deploy on the VPS (SSH)

SSH into the server (from your PC or ChatGPT with server access), then:

```bash
sudo bash -c 'curl -fsSL https://raw.githubusercontent.com/kailasadhav-svg/paramanand-dham-satsang/main/deploy/setup-vps.sh -o /tmp/setup-vps.sh && bash /tmp/setup-vps.sh'
```

Or clone first, then:

```bash
cd /var/www/satsang   # or anywhere
git clone https://github.com/kailasadhav-svg/paramanand-dham-satsang.git .
sudo bash deploy/setup-vps.sh
```

The script:

1. Installs Node 22 + nginx + certbot (if missing)
2. Clones/pulls the repo to `/var/www/satsang`
3. Builds the app and starts **systemd** unit `satsang` on port `43123`
4. Adds an nginx site **only** for `satsang.dhyeyapurti.in` (other sites unchanged)
5. Issues Let's Encrypt HTTPS via certbot

## 3. Verify

```bash
curl -sS https://satsang.dhyeyapurti.in/api/health
# expect: {"ok":true,...,"db":{"ok":true,"store":"file"}}

systemctl status satsang --no-pager
```

Open on phone: **https://satsang.dhyeyapurti.in**

## 4. Env on VPS

File: `/var/www/satsang/.env.local`

- Uses **local SQLite** (`data/satsang.db`) — do **not** set `TURSO_*` on the VPS unless you intentionally want Turso
- Set `COOKIE_SECURE=true` and `APP_PUBLIC_URL=https://satsang.dhyeyapurti.in`
- Add WhatsApp / Turiya keys when ready; keep `WHATSAPP_DRY_RUN=1` until webhook points to this domain

After env changes:

```bash
sudo systemctl restart satsang
```

## 5. WhatsApp webhook (later)

Point Meta / Turiya callback to:

`https://satsang.dhyeyapurti.in/api/whatsapp/webhook`

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Browser SSL warning | Cert is still `sslip.io` — run `sudo certbot --nginx -d satsang.dhyeyapurti.in` |
| nginx `403 Forbidden` | App not running or wrong vhost — `systemctl status satsang` and confirm nginx site enabled |
| Port `43123` closed from internet | Good — only nginx should be public; app listens on localhost |
| Old site broken | This config only adds `satsang.dhyeyapurti.in`; do not delete other nginx sites |

## Note for Cursor Cloud Agent

This agent **cannot SSH** into the Hostinger VPS. After DNS is ready, run `deploy/setup-vps.sh` on the server (you or ChatGPT with SSH).
