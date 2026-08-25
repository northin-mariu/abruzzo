#!/bin/bash
# Smoke test for the abruzzo-picks Cloudflare Worker (worker/abruzzo-picks.js).
#
#   ./worker/smoke.sh https://abruzzo-picks.<account>.workers.dev
#
# Uses curl only. Writes a throwaway "SmokeTest" name, then deletes it again.
# Prints PASS/FAIL per step and exits non-zero if anything failed.

set -u

if [ "${1:-}" = "" ]; then
  echo "usage: $0 https://abruzzo-picks.<account>.workers.dev" >&2
  exit 2
fi

BASE="${1%/}"
NAME="SmokeTest"
FAILS=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAILS=$((FAILS + 1)); }

# JSON with all whitespace removed, so matching does not depend on formatting.
squash() { printf '%s' "$1" | tr -d ' \t\r\n'; }

# GET /picks, print the body, and echo it for the caller to inspect.
get_picks() {
  curl -sS -m 20 "$BASE/picks"
}

# 1. GET /picks must return JSON (an object).
echo "--- 1. GET $BASE/picks"
BODY="$(get_picks)" || BODY=""
echo "$BODY"
case "$BODY" in
  "{"*) pass "GET /picks returned JSON" ;;
  *)    fail "GET /picks did not return a JSON object" ;;
esac

# 2. PUT /picks/SmokeTest with one valid and one invalid id -> n must be 1.
echo "--- 2. PUT $BASE/picks/$NAME"
BODY="$(curl -sS -m 20 -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"ids":["trabocco-punta-cavalluccio","not a valid id!!"]}' \
  "$BASE/picks/$NAME")" || BODY=""
echo "$BODY"
case "$(squash "$BODY")" in
  *'"ok":true'*'"n":1'*) pass "PUT stored 1 id (invalid id filtered out)" ;;
  *)                      fail "PUT did not return {\"ok\":true,...,\"n\":1}" ;;
esac

# 3. GET /picks must now list SmokeTest.
echo "--- 3. GET $BASE/picks (expect $NAME present)"
BODY="$(get_picks)" || BODY=""
echo "$BODY"
case "$BODY" in
  *"\"$NAME\""*) pass "GET /picks contains $NAME" ;;
  *)             fail "GET /picks does not contain $NAME" ;;
esac

# 4. DELETE /picks/SmokeTest -> ok.
echo "--- 4. DELETE $BASE/picks/$NAME"
BODY="$(curl -sS -m 20 -X DELETE "$BASE/picks/$NAME")" || BODY=""
echo "$BODY"
case "$(squash "$BODY")" in
  *'"ok":true'*) pass "DELETE returned ok" ;;
  *)             fail "DELETE did not return ok" ;;
esac

# 5. GET /picks must no longer list SmokeTest.
echo "--- 5. GET $BASE/picks (expect $NAME gone)"
BODY="$(get_picks)" || BODY=""
echo "$BODY"
case "$BODY" in
  *"\"$NAME\""*) fail "GET /picks still contains $NAME" ;;
  *)             pass "GET /picks no longer contains $NAME" ;;
esac

# 6. OPTIONS preflight from the GitHub Pages origin -> 204 + CORS header.
echo "--- 6. OPTIONS $BASE/picks (Origin: https://northin-mariu.github.io)"
HEADERS="$(curl -sS -m 20 -i -X OPTIONS \
  -H 'Origin: https://northin-mariu.github.io' \
  -H 'Access-Control-Request-Method: PUT' \
  "$BASE/picks")" || HEADERS=""
STATUS="$(printf '%s\n' "$HEADERS" | head -n 1 | awk '{print $2}')"
echo "status: ${STATUS:-none}"
if [ "$STATUS" = "204" ]; then
  pass "OPTIONS returned 204"
else
  fail "OPTIONS returned ${STATUS:-nothing}, expected 204"
fi
if printf '%s\n' "$HEADERS" | grep -qi '^access-control-allow-origin:'; then
  pass "OPTIONS sent Access-Control-Allow-Origin"
else
  fail "OPTIONS did not send Access-Control-Allow-Origin"
fi

echo "---"
if [ "$FAILS" -eq 0 ]; then
  echo "All checks passed."
  exit 0
fi
echo "$FAILS check(s) failed."
exit 1
