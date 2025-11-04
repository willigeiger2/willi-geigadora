#!/usr/bin/env zsh

# Config
TOKEN="d8uWzRrb-qRBNOFCiKyAaq2UgnwLMU8DUUb8Fzly"
BASE="https://image-classifier-worker.willigeiger.workers.dev"
MODEL="%40cf%2Fllava-hf%2Fllava-1.5-7b-hf"  # URL-encoded '@cf/llava-hf/llava-1.5-7b-hf'
FORCE=1
PER_PAGE=10
MAX_PER_CALL=10
START_PAGE=1
END_PAGE=61

for (( p = START_PAGE; p <= END_PAGE; p++ )); do
  echo "Processing page $p ..."
  resp=$(curl -sS -X POST "$BASE/batch?mode=page&start_page=$p&per_page=$PER_PAGE&max=$MAX_PER_CALL&model=$MODEL&force=$FORCE" \
    -H "Authorization: Bearer $TOKEN" -H "Accept: application/json")
  echo "$resp"

  processed=$(echo "$resp" | awk -F'"processed":' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
  if [[ -z "$processed" || "$processed" -eq 0 ]]; then
    echo "No more images (processed=$processed). Stopping."
    break
  fi
  sleep 1
done