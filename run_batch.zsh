#!/usr/bin/env zsh

# Config
TOKEN="d8uWzRrb-qRBNOFCiKyAaq2UgnwLMU8DUUb8Fzly"
BASE="https://image-classifier-worker.willigeiger.workers.dev"
PER_PAGE=8
MAX_PER_CALL=8
START_PAGE=1
END_PAGE=80

for (( p = START_PAGE; p <= END_PAGE; p++ )); do
  echo "Processing page $p ..."
  resp=$(curl -sS -X POST "$BASE/batch?mode=page&start_page=$p&per_page=$PER_PAGE&max=$MAX_PER_CALL" \
    -H "Authorization: Bearer $TOKEN" -H "Accept: application/json")
  echo "$resp"

  processed=$(echo "$resp" | awk -F'"processed":' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
  if [[ -z "$processed" || "$processed" -eq 0 ]]; then
    echo "No more images (processed=$processed). Stopping."
    break
  fi
  sleep 1
done