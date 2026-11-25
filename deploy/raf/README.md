# Raf on a server

Runs the HTTPS proxy (Caddy, free certificates), the [API](../../apps/shelf-tracker/raf-api)
with its receipt reader, and Postgres on one Linux server with Docker. Only ports 80 and 443
are open.

You need a server with at least 2 CPU cores and 4 GB of memory, a domain name whose DNS A
record points at it, and an email provider (SMTP) for password reset codes. Receipts are read
one at a time, about 15 seconds per photo on 2–4 cores; more cores make it faster. Phones do
not wait for it: they upload, and poll until the receipt is ready.

## Start

```bash
cd deploy/raf
cp .env.example .env            # fill it in
docker compose up -d --build    # the first build downloads the OCR models
curl https://<DOMAIN>/health
```

The API does not start when a setting is missing or is an example value; `docker compose logs api`
says which. It applies database migrations when it starts. Update with `git pull` and the same
`up -d --build`.

Check these in a browser; the store listing links to them:
`https://<DOMAIN>/privacy`, `/terms` and `/delete-account` (`?lang=tr` for Turkish).

## Backups

```bash
./backup.sh /var/backups/raf
crontab -e      # 0 4 * * *  /path/to/deploy/raf/backup.sh /var/backups/raf
```

It keeps 30 days, because the privacy notice says so. Restore into an empty database:

```bash
docker compose exec -T db pg_restore -U raf -d raf --clean --if-exists < db-<date>.dump
docker compose exec -T api tar xzf - -C /app < uploads-<date>.tgz
```

## Deletion requests by email

People without the app write to `SUPPORT_EMAIL` (see `/delete-account`). Check that the message
comes from the account's own address, then delete through the API so photos go too: send a
password reset code to that address and let them delete it in the app, or, for someone who cannot:

```bash
docker compose exec db psql -U raf -c "SELECT r.\"imageKeys\" FROM \"Receipt\" r JOIN \"User\" u ON u.id = r.\"userId\" WHERE u.email = '<email>';"
docker compose exec api rm -f /app/uploads/<each key>
docker compose exec db psql -U raf -c "DELETE FROM \"User\" WHERE email = '<email>';"
```

## With Evlog on the same server

Both use ports 80 and 443, so run one proxy for both: remove the `proxy` service here, put the
API on the other stack's `web` network, and give that Caddy a Caddyfile with both domains.
