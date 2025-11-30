#!/bin/bash

# Script to find files exceeding a specified line count
# Usage: ./find-large-files.sh <min_lines>

if [ -z "$1" ]; then
    echo "Usage: $0 <min_lines>"
    echo "Example: $0 500"
    exit 1
fi

MIN_LINES=$1

if ! [[ "$MIN_LINES" =~ ^[0-9]+$ ]]; then
    echo "Error: Argument must be a positive integer"
    exit 1
fi

echo "Finding files with more than $MIN_LINES lines..."
echo ""

# Use git ls-files if in a git repo (much faster), otherwise fall back to find
if git rev-parse --git-dir > /dev/null 2>&1; then
    git ls-files -z 2>/dev/null | \
        grep -zv '\.ya\?ml$' | \
        grep -zv '/migrations/' | \
        xargs -0 wc -l 2>/dev/null | \
        awk -v min="$MIN_LINES" '$1 > min && $1 != "total" {print $1, $2}' | \
        sort -rn
else
    find . -type f \
        -not -path "*/node_modules/*" \
        -not -path "*/.next/*" \
        -not -path "*/dist/*" \
        -not -path "*/build/*" \
        -not -path "*/.git/*" \
        -not -path "*/.turbo/*" \
        -not -path "*/coverage/*" \
        -not -path "*/.cache/*" \
        -not -path "*/out/*" \
        -not -path "*/.vercel/*" \
        -not -path "*/migrations/*" \
        -not -name "*.yaml" \
        -not -name "*.yml" \
        -print0 2>/dev/null | \
        xargs -0 wc -l 2>/dev/null | \
        awk -v min="$MIN_LINES" '$1 > min && $1 != "total" {print $1, $2}' | \
        sort -rn
fi

echo ""
echo "Done!"
