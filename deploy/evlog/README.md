# Evlog on a server

Runs the HTTPS proxy (Caddy, free certificates), the [API](../../apps/home-tracker/api),
the [receipt reader](../../services/receipt-reader) and Postgres on one Linux server with
Docker. Only ports 80 and 443 are open; the reader and the database are on internal networks.

You need a server with at least 2 CPU cores and 4 GB of memory, and a domain name whose
DNS A record points at it. Reading a receipt is the heavy part: the reader reads one at a
time, 15–30 seconds each on a CPU. The API gives up on a read after 90 seconds, so with more
than about three receipts at once some will fail and have to be scanned again.

## Start

```bash
cd deploy/evlog
cp .env.example .env            # fill it in
docker compose up -d --build    # the first build downloads the OCR models
curl https://<DOMAIN>/health
```

The API applies database migrations when it starts. Update with `git pull` and the same
`up -d --build`. `docker compose logs -f api receipt-reader` follows the logs.

## Reader on its own server

Build it there with a private address (Tailscale, WireGuard or the provider's private
network), never on a public port: requests carry receipt photos over plain HTTP.

```bash
docker build -t receipt-reader services/receipt-reader
docker run -d --restart unless-stopped -p <PRIVATE-IP>:8000:8000 -e OCR_SERVICE_TOKEN=<token> receipt-reader
```

Then set `OCR_SERVICE_URL` in `docker-compose.yml` to `http://<PRIVATE-IP>:8000`, use the same
`OCR_SERVICE_TOKEN`, remove the `receipt-reader` service and take the API off the `reader` network.

## Backups

Back up both together: the photos are only in the `uploads` volume.

```bash
docker compose exec -T db pg_dump -U evlog -Fc evlog > evlog-$(date +%F).dump
docker run --rm -v evlog-server_uploads:/data:ro -v "$PWD":/out alpine tar czf /out/uploads-$(date +%F).tgz -C /data .
```

Store them away from this server. Deleted accounts stay in old backups, so delete backups
after a fixed time (for example 30 days) and state it in the privacy notice.

## Moderation

Anyone can report a rating or photo in the app, and brokers can report through their link.
New reports are logged by the API (`Report … RATING …`); check them daily, because the terms
of use say they are reviewed within 24 hours.

Make an account a moderator (there is no way to do this through the API):

```bash
docker compose exec db psql -U evlog -c "UPDATE \"User\" SET role = 'MODERATOR' WHERE email = '<email>';"
```

Then, with that account:

```bash
API=https://<DOMAIN>/api/v1
TOKEN=$(curl -s $API/auth/login -H 'content-type: application/json' \
  -d '{"email":"<email>","password":"<password>"}' | jq -r .accessToken)    # valid for 15 minutes
curl -s $API/moderation/reports -H "Authorization: Bearer $TOKEN" | jq
curl -s $API/moderation/photos/<targetId>/file -H "Authorization: Bearer $TOKEN" -o photo.jpg
curl -s $API/moderation/reports/<id>/resolve -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"action":"HIDE","note":"why"}'
```

| Action | Effect |
| --- | --- |
| `DISMISS` | The content is fine; nothing changes. |
| `HIDE_NOTE` | Ratings only: hides the note, keeps the scores. |
| `HIDE` | Hides the rating with its scores, the photo or the listing, also in what brokers were already sent. |
| `RESTORE` | Shows hidden content again. |

One decision closes every open report about the same content. `?status=ACTIONED` or
`?status=DISMISSED` lists earlier ones.
