#!/bin/bash

## Usage: ./restore-db.sh <DEST_DB_URL> <DEST_DB_PASSWORD> <INPUT_DUMP_FILE>

if [ "$#" -ne 3 ]; then
    echo "Usage: ./restore-db.sh <DEST_DB_URL> <DEST_DB_PASSWORD> <INPUT_DUMP_FILE>"
    exit 1
fi

DEST_DB_URL="$1"
DEST_DB_PASSWORD="$2"
INPUT_DUMP_FILE="$3"

PGPASSWORD="$DEST_DB_PASSWORD" pg_restore --verbose --clean --if-exists --no-owner --jobs 4 "$DEST_DB_URL" < "$INPUT_DUMP_FILE"

if [ $? -eq 0 ]; then
    echo "Database restored successfully from $INPUT_DUMP_FILE to $DEST_DB_URL"
else
    echo "Error restoring database."
    exit 1
fi 