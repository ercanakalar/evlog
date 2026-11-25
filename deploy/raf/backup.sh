#!/bin/sh
# Backs up Raf's database and receipt photos, and deletes backups older than 30
# days: the privacy notice promises that deleted data is gone from backups by then.
#
#   ./backup.sh /var/backups/raf
#
# Copy the folder to another place too (with the same 30-day limit).
set -eu
cd "$(dirname "$0")"
target=${1:?usage: backup.sh <folder>}
mkdir -p "$target"
chmod 700 "$target"
now=$(date +%Y%m%d-%H%M%S)
docker compose exec -T db pg_dump -U raf -Fc raf > "$target/db-$now.dump.part"
mv "$target/db-$now.dump.part" "$target/db-$now.dump"
docker compose exec -T api tar czf - -C /app uploads > "$target/uploads-$now.tgz.part"
mv "$target/uploads-$now.tgz.part" "$target/uploads-$now.tgz"
find "$target" -maxdepth 1 -type f \( -name 'db-*' -o -name 'uploads-*' \) -mtime +29 -delete
echo "Backed up to $target ($now)"
