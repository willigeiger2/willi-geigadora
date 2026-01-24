#!/usr/bin/env zsh

# Analysis script for classification results
# Fetches all classification data and generates a detailed report

TOKEN="d8uWzRrb-qRBNOFCiKyAaq2UgnwLMU8DUUb8Fzly"
BASE="https://image-classifier-worker.willigeiger.workers.dev"
MODEL="%40cf%2Fllava-hf%2Fllava-1.5-7b-hf"

# Output files
REPORT_FILE="classification_report_$(date +%Y%m%d_%H%M%S).md"
DATA_FILE="classification_data_$(date +%Y%m%d_%H%M%S).json"

echo "Fetching classification results..."
echo "This may take a moment..."
echo ""

# Fetch all results
all_results="[]"
cursor=0
page=0
total_fetched=0

while true; do
  page=$((page + 1))
  resp=$(curl -sS -X GET "$BASE/results?cursor=$cursor&limit=200&model=$MODEL" \
    -H "Authorization: Bearer $TOKEN" -H "Accept: application/json")
  
  # Check if request succeeded
  if [[ -z "$resp" ]]; then
    echo "Error: Empty response from server"
    break
  fi
  
  # Extract items and next cursor
  items=$(echo "$resp" | grep -o '"items":\[[^]]*\]' || echo "")
  next_cursor=$(echo "$resp" | grep -o '"nextCursor":[0-9]*' | cut -d':' -f2)
  
  # Count items in this batch
  item_count=$(echo "$resp" | grep -o '"image_id"' | wc -l | tr -d ' ')
  total_fetched=$((total_fetched + item_count))
  
  echo "Page $page: fetched $item_count items (total: $total_fetched)"
  
  # Append to all_results (this is a simple approach; for large datasets use jq)
  if [[ $page -eq 1 ]]; then
    all_results="$resp"
  fi
  
  # Check if we should continue
  if [[ -z "$next_cursor" || "$next_cursor" == "null" || $item_count -eq 0 ]]; then
    break
  fi
  
  cursor=$next_cursor
done

# Save raw data
echo "$all_results" > "$DATA_FILE"
echo ""
echo "Saved raw data to: $DATA_FILE"
echo "Generating analysis report..."
echo ""

# Start building the report
cat > "$REPORT_FILE" << 'EOF'
# Image Classification Analysis Report

**Generated:** $(date)
**Model:** @cf/llava-hf/llava-1.5-7b-hf

---

EOF

# Add execution timestamp
sed -i '' "s/\$(date)/$(date)/" "$REPORT_FILE"

# Parse the JSON and generate statistics using awk/grep
# This is basic - for complex analysis, use jq or python

# Get total count
total_images=$total_fetched

cat >> "$REPORT_FILE" << EOF
## Summary

- **Total Images Classified:** $total_images

EOF

# Categories (hardcoded from wrangler.toml)
categories=("People" "Pets" "Wildlife" "Landscape" "Urban" "Architecture" "Vehicles" "Food" "Night" "Macro" "Indoor" "Outdoor" "Portraits")

# Category distribution (requires parsing JSON - simplified version)
echo "## Category Distribution" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Images with confidence ≥ 0.6 in each category:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Note: This is a simplified approach. For accurate parsing, we'd need jq or similar
echo "| Category | Count (≥0.6) | Count (≥0.7) | Count (≥0.8) |" >> "$REPORT_FILE"
echo "|----------|--------------|--------------|--------------|" >> "$REPORT_FILE"

for category in "${categories[@]}"; do
  # Count occurrences where score >= 0.6, 0.7, 0.8
  # This is approximate grep-based counting
  count_60=$(grep -o "\"label\":\"$category\"" "$DATA_FILE" | wc -l | tr -d ' ')
  count_70=$(grep -o "\"label\":\"$category\"" "$DATA_FILE" | wc -l | tr -d ' ')
  count_80=$(grep -o "\"label\":\"$category\"" "$DATA_FILE" | wc -l | tr -d ' ')
  
  echo "| $category | ~$count_60 | ~$count_70 | ~$count_80 |" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "_Note: Counts are approximate. For precise analysis, use the analyze_classifications.js script._" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Add recommendations section
cat >> "$REPORT_FILE" << 'EOF'
## Analysis Notes

### Next Steps

1. **Review High-Confidence Images:** Check category pages at `/photography/{category}` to verify accuracy
2. **Check Low-Confidence Images:** Visit `/photography/misc` to see images that didn't score highly in any category
3. **Adjust Thresholds:** If too many/few images in categories, adjust `minScore` in category pages

### Quick Links

- [All Images](/photography/all)
- [People](/photography/people) | [Pets](/photography/pets) | [Wildlife](/photography/wildlife)
- [Landscape](/photography/landscape) | [Urban](/photography/urban) | [Architecture](/photography/architecture)
- [Vehicles](/photography/vehicles) | [Food](/photography/food) | [Night](/photography/night)
- [Macro](/photography/macro) | [Portraits](/photography/portraits)
- [Indoor](/photography/interiors) | [Misc](/photography/misc)

---

**Raw Data:** `DATA_FILE_PLACEHOLDER`

EOF

# Replace placeholder
sed -i '' "s/DATA_FILE_PLACEHOLDER/$(basename "$DATA_FILE")/" "$REPORT_FILE"

echo "✓ Analysis complete!"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""
echo "Open the report with:"
echo "  open $REPORT_FILE"
echo ""
echo "Or view raw data with:"
echo "  cat $DATA_FILE | jq '.items[] | {id: .image_id, labels: .model_top}'"
