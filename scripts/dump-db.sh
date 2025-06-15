#!/bin/bash

## Usage: ./dump-db.sh <SOURCE_DB_URL> <SOURCE_DB_PASSWORD> <OUTPUT_DUMP_FILE>

if [ "$#" -ne 3 ]; then
    echo "Usage: ./dump-db.sh <SOURCE_DB_URL> <SOURCE_DB_PASSWORD> <OUTPUT_DUMP_FILE>"
    exit 1
fi

SOURCE_DB_URL=$(echo "$1" | sed 's/&supa=[^&]*//')
SOURCE_DB_PASSWORD="$2"
OUTPUT_DUMP_FILE="$3"

PGPASSWORD="$SOURCE_DB_PASSWORD" pg_dump -Fc --no-owner --no-acl -f "$OUTPUT_DUMP_FILE" "$SOURCE_DB_URL"

if [ $? -eq 0 ]; then
    echo "Database dumped successfully from $SOURCE_DB_URL to $OUTPUT_DUMP_FILE"
else
    echo "Error dumping database."
    exit 1
fi 