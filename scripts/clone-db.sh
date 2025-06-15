#!/bin/bash

## Usage: ./clone-db.sh <SOURCE_DB_URL> <DEST_DB_URL> <SOURCE_DB_PASSWORD> <DEST_DB_PASSWORD>

if [ "$#" -ne 4 ]; then
    echo "Usage: ./clone-db.sh <SOURCE_DB_URL> <DEST_DB_URL> <SOURCE_DB_PASSWORD> <DEST_DB_PASSWORD>"
    exit 1
fi

SOURCE_DB_URL="$1"
DEST_DB_URL="$2"
SOURCE_DB_PASSWORD="$3"
DEST_DB_PASSWORD="$4"


## Dump the source database and restore to the destination database
PGPASSWORD="$SOURCE_DB_PASSWORD" pg_dump -Fc --no-owner --no-acl "$SOURCE_DB_URL" | PGPASSWORD="$DEST_DB_PASSWORD" pg_restore --verbose --clean --if-exists --no-owner --jobs 4 "$DEST_DB_URL"

if [ $? -eq 0 ]; then
    echo "Database cloned successfully from $SOURCE_DB_URL to $DEST_DB_URL"
else
    echo "Error cloning database."
    exit 1
fi 