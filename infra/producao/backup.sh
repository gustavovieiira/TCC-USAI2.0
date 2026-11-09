#!/usr/bin/env bash
# Backup diário da USAI: o banco (mysqldump) e as fotos enviadas (volume `uploads`), em /opt/usai/backups.
# Guarda os últimos 7 dias. Roda pelo cron do usuário `deploy` (ver README.md). Para restaurar, veja o README.
set -euo pipefail

cd "$(dirname "$0")"
DESTINO=/opt/usai/backups
CARIMBO=$(date +%F-%H%M)
mkdir -p "$DESTINO"
chmod 700 "$DESTINO"

set -a
# shellcheck disable=SC1091
. ./.env
set +a

docker compose exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql \
  mysqldump -uroot --single-transaction --routines --triggers usai | gzip -9 > "$DESTINO/usai-banco-$CARIMBO.sql.gz"

docker run --rm -v usai_uploads:/origem:ro -v "$DESTINO":/destino alpine:3 \
  tar czf "/destino/usai-uploads-$CARIMBO.tgz" -C /origem .

# Confere que o arquivo do banco abre (um backup corrompido é pior que nenhum) e apaga o que passou de 7 dias.
gzip -t "$DESTINO/usai-banco-$CARIMBO.sql.gz"
find "$DESTINO" -type f -mtime +7 -delete
echo "Backup ok: $DESTINO/usai-banco-$CARIMBO.sql.gz e usai-uploads-$CARIMBO.tgz"
