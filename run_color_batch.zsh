#!/usr/bin/env zsh

# Config
TOKEN="d8uWzRrb-qRBNOFCiKyAaq2UgnwLMU8DUUb8Fzly"
BASE="https://color-analyzer-worker.willigeiger.workers.dev"
FORCE=1
PER_PAGE=10
MAX_PER_CALL=10
START_PAGE=1
END_PAGE=61

# Output file for detailed results
RESULTS_FILE="color_analysis_$(date +%Y%m%d_%H%M%S).jsonl"

# Running totals
total_processed=0
total_upserted=0
total_skipped=0
total_errors=0
start_time=$(date +%s)

echo "=================================="
echo "Color Analysis Batch Run"
echo "Started: $(date)"
echo "Model: color-analyzer"
echo "Force reprocess: $FORCE"
echo "Results file: $RESULTS_FILE"
echo "=================================="
echo ""

for (( p = START_PAGE; p <= END_PAGE; p++ )); do
  page_start=$(date +%s)
  echo "Page $p/$END_PAGE ..."
  
  resp=$(curl -sS -X POST "$BASE/batch?mode=page&start_page=$p&per_page=$PER_PAGE&max=$MAX_PER_CALL&force=$FORCE" \
    -H "Authorization: Bearer $TOKEN" -H "Accept: application/json")
  
  # Save full response to results file
  echo "$resp" >> "$RESULTS_FILE"
  
  # Parse response
  processed=$(echo "$resp" | grep -o '"processed":[0-9]*' | cut -d':' -f2)
  upserted=$(echo "$resp" | grep -o '"upserted":[0-9]*' | cut -d':' -f2)
  skipped=$(echo "$resp" | grep -o '"skipped":[0-9]*' | cut -d':' -f2)
  error_count=$(echo "$resp" | grep -o '"errors":\[[^]]*\]' | grep -o '{' | wc -l | tr -d ' ')
  
  # Default to 0 if parsing failed
  processed=${processed:-0}
  upserted=${upserted:-0}
  skipped=${skipped:-0}
  error_count=${error_count:-0}
  
  # Update totals
  total_processed=$((total_processed + processed))
  total_upserted=$((total_upserted + upserted))
  total_skipped=$((total_skipped + skipped))
  total_errors=$((total_errors + error_count))
  
  # Calculate page timing
  page_end=$(date +%s)
  page_duration=$((page_end - page_start))
  
  # Calculate overall stats
  elapsed=$((page_end - start_time))
  rate=$(echo "scale=2; $total_processed / $elapsed" | bc 2>/dev/null || echo "0")
  
  # Progress bar
  progress=$((p * 100 / END_PAGE))
  bar_filled=$((progress / 2))
  bar_empty=$((50 - bar_filled))
  printf "  ["
  printf "%${bar_filled}s" | tr ' ' '='
  printf "%${bar_empty}s" | tr ' ' '-'
  printf "] %3d%%\n" $progress
  
  # Page summary
  echo "  Processed: $processed | Upserted: $upserted | Skipped: $skipped | Errors: $error_count | Time: ${page_duration}s"
  
  # Running totals
  echo "  TOTALS: $total_processed processed, $total_upserted new, $total_skipped skipped, $total_errors errors | Rate: ${rate}/s"
  
  # Show errors if any
  if [[ $error_count -gt 0 ]]; then
    echo "  ⚠️  Errors detected on this page - check $RESULTS_FILE for details"
  fi
  
  echo ""
  
  # Check if we should stop
  if [[ $processed -eq 0 ]]; then
    echo "No more images to process. Stopping."
    break
  fi
  
  sleep 1
done

# Final summary
end_time=$(date +%s)
total_duration=$((end_time - start_time))
minutes=$((total_duration / 60))
seconds=$((total_duration % 60))

echo "=================================="
echo "Batch Run Complete"
echo "Finished: $(date)"
echo "Duration: ${minutes}m ${seconds}s"
echo ""
echo "Summary:"
echo "  Images processed: $total_processed"
echo "  New color analyses: $total_upserted"
echo "  Skipped (already analyzed): $total_skipped"
echo "  Errors: $total_errors"
echo ""
echo "Results saved to: $RESULTS_FILE"
echo "=================================="
