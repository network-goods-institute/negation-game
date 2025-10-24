#!/usr/bin/env bash
set -euo pipefail

# Simple curl-based middleware smoke tests
# BASE can be overridden, defaults to http://localhost:3001

BASE=${BASE:-http://localhost:3001}

cyan() { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }

curl_head() {
  local path=$1
  local host_header=${2:-}
  if [[ -n "$host_header" ]]; then
    curl -sS -o /dev/null -D - -H "Host: ${host_header}" "${BASE}${path}"
  else
    curl -sS -o /dev/null -D - "${BASE}${path}"
  fi
}

extract_status() { awk '/^HTTP/{code=$2} END{print code}'; }
extract_header_ci() { awk -v key="${1}" 'BEGIN{IGNORECASE=1} tolower($0) ~ "^" tolower(key) ":" {val=$0} END{print val}'; }

assert_redirect() {
  local path=$1 expected_substr=$2 host_header=${3:-}
  cyan "[REDIRECT] GET ${BASE}${path} (Host: ${host_header:-<default>})"
  local out status location
  out=$(curl_head "$path" "$host_header")
  status=$(printf "%s" "$out" | extract_status)
  location=$(printf "%s" "$out" | extract_header_ci location | sed -E 's/^[Ll]ocation:\s*//')
  if [[ "$status" != "307" ]]; then
    printf "%s\n" "$out" >&2
    red "Expected 307, got ${status}"
    exit 1
  fi
  if [[ "$location" != *"$expected_substr"* ]]; then
    printf "%s\n" "$out" >&2
    red "Location header missing expected substring: $expected_substr"
    exit 1
  fi
  green "OK 307 -> $location"
}

assert_no_redirect() {
  local path=$1 host_header=${2:-}
  cyan "[NO REDIRECT] GET ${BASE}${path} (Host: ${host_header:-<default>})"
  local out status
  out=$(curl_head "$path" "$host_header")
  status=$(printf "%s" "$out" | extract_status)
  if [[ ${status:0:1} == "3" ]]; then
    printf "%s\n" "$out" >&2
    red "Unexpected redirect status: ${status}"
    exit 1
  fi
  green "OK status ${status} (no redirect)"
}

assert_header_contains() {
  local path=$1 header_key=$2 expected_substr=$3 host_header=${4:-}
  cyan "[HEADER] GET ${BASE}${path} (Host: ${host_header:-<default>}) expects ${header_key} contains '${expected_substr}'"
  local out header
  out=$(curl_head "$path" "$host_header")
  header=$(printf "%s" "$out" | extract_header_ci "$header_key" | sed -E "s/^${header_key}:[[:space:]]*//I")
  if [[ -z "$header" || "$header" != *"$expected_substr"* ]]; then
    printf "%s\n" "$out" >&2
    red "Header ${header_key} missing or does not contain '${expected_substr}'"
    exit 1
  fi
  green "OK ${header_key}: ${header}"
}

assert_header_absent() {
  local path=$1 header_key=$2 host_header=${3:-}
  cyan "[HEADER ABSENT] GET ${BASE}${path} (Host: ${host_header:-<default>}) expects no ${header_key}"
  local out header
  out=$(curl_head "$path" "$host_header")
  header=$(printf "%s" "$out" | extract_header_ci "$header_key")
  if [[ -n "$header" ]]; then
    printf "%s\n" "$out" >&2
    red "Header ${header_key} should be absent but was present: ${header}"
    exit 1
  fi
  green "OK ${header_key} absent"
}

main() {
  # Root redirects
  assert_redirect "/play" "https://play.negationgame.com/"
  assert_redirect "/play/some/path?foo=bar&baz=qux" "/some/path?" # query preserved
  assert_redirect "/scroll" "https://scroll.negationgame.com/"
  assert_redirect "/scroll/some/path?x=1" "/some/path?x=1"
  assert_redirect "/s/global" "https://play.negationgame.com/s/global"
  assert_redirect "/settings" "https://play.negationgame.com/settings"
  assert_redirect "/notifications" "https://play.negationgame.com/notifications"
  assert_redirect "/messages" "https://play.negationgame.com/messages"
  assert_redirect "/admin" "https://play.negationgame.com/admin"
  assert_redirect "/privacy" "https://play.negationgame.com/privacy"
  assert_redirect "/tos" "https://play.negationgame.com/tos"
  assert_redirect "/delta" "https://play.negationgame.com/delta"
  assert_redirect "/profile/username" "https://play.negationgame.com/profile/username"

  # Root allowed path (no redirect) and headers
  assert_no_redirect "/experiment/rationale/multiplayer"
  assert_header_contains "/experiment/rationale/multiplayer" "X-Robots-Tag" "noindex"

  # Root viewpoint -> rationale (segment-safe) redirect
  assert_redirect "/viewpoint/123" "/rationale/123"

  # Sensitive paths blocked
  cyan "[SENSITIVE] /.env should 404 and be noindex"
  out=$(curl_head "/.env")
  status=$(printf "%s" "$out" | extract_status)
  if [[ "$status" != "404" ]]; then
    printf "%s\n" "$out" >&2
    red "Expected 404 for /.env, got ${status}"
    exit 1
  fi
  printf "%s" "$out" | extract_header_ci X-Robots-Tag | grep -qi "noindex" || { printf "%s\n" "$out" >&2; red "Missing X-Robots-Tag noindex for /.env"; exit 1; }
  green "OK /.env blocked"

  # Subdomain: play (host header)
  assert_no_redirect "/" "play.negationgame.com"
  assert_redirect "/viewpoint/abc" "/rationale/abc" "play.negationgame.com"

  # Subdomain: scroll (rewrite, not redirect). Check x-space header present
  assert_no_redirect "/" "scroll.negationgame.com"
  assert_header_contains "/" "x-space" "scroll" "scroll.negationgame.com"
  assert_header_contains "/chat" "x-space" "scroll" "scroll.negationgame.com"

  # Subdomain: sync (rewrite to multiplayer routes, no redirect)
  assert_no_redirect "/" "sync.negationgame.com"
  assert_no_redirect "/board/test-board" "sync.negationgame.com"

  # Embeds on play: allow iframes and unified CSP
  assert_header_absent "/embed/scroll/source" "X-Frame-Options" "play.negationgame.com"
  assert_header_contains "/embed/scroll/source" "Content-Security-Policy" "frame-ancestors" "play.negationgame.com"
  assert_header_contains "/embed/scroll/source" "Content-Security-Policy" "cdn.tldraw.com" "play.negationgame.com"

  # Embed via query param
  assert_header_absent "/s/global?embed=mobile" "X-Frame-Options" "play.negationgame.com"
  assert_header_contains "/s/global?embed=mobile" "Content-Security-Policy" "frame-ancestors" "play.negationgame.com"
  assert_header_contains "/s/global?embed=mobile" "x-pathname" "/embed/s/global" "play.negationgame.com"

  green "\nAll curl smoke checks passed."
}

main "$@"


