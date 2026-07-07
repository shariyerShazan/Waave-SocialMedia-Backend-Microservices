#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_roles WHERE rolname = 'replicator'
    ) THEN
        CREATE ROLE replicator
        WITH REPLICATION
        LOGIN
        PASSWORD 'replicator_pass';
    END IF;
END
\$\$;
EOF

cat >> "$PGDATA/pg_hba.conf" <<EOF
host replication replicator 0.0.0.0/0 md5
EOF