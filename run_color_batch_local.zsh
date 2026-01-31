#!/usr/bin/env zsh

# Config
TOKEN="d8uWzRrb-qRBNOFCiKyAaq2UgnwLMU8DUUb8Fzly"
BASE_WORKER="https://color-analyzer-worker.willigeiger.workers.dev"
CF_ACCOUNT_ID="3ce0a7682b4404afc52b42b6af1152b4"
CF_API_TOKEN=$(grep CLOUDFLARE_IMAGES_TOKEN /Users/willi/src/personal/willi-geigadora/.env 2>/dev/null | cut -d'=' -f2 | tr -d ' ')
FORCE=1  # Set to 1 to reprocess already-analyzed images
PER_PAGE=10
START_PAGE=1
END_PAGE=61  # Total images from Cloudflare: ~610 images / 10 per page = 61 pages

# Output file
RESULTS_FILE="color_analysis_local_$(date +%Y%m%d_%H%M%S).jsonl"
ERRORS_FILE="color_analysis_errors_$(date +%Y%m%d_%H%M%S).log"

# Running totals
total_processed=0
total_uploaded=0
total_skipped=0
total_errors=0
start_time=$(date +%s)

echo "=================================="
echo "Local Color Analysis Batch Run"
echo "Started: $(date)"
echo "Force reprocess: $FORCE"
echo "Results file: $RESULTS_FILE"
echo "Errors file: $ERRORS_FILE"
echo "=================================="
echo ""

# Check Python dependencies
echo "Checking Python dependencies..."
python3 -c "import PIL; import numpy; import requests" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "❌ Missing Python dependencies. Installing..."
  pip3 install Pillow numpy requests
  if [ $? -ne 0 ]; then
    echo "Failed to install dependencies. Please run:"
    echo "  pip3 install Pillow numpy requests"
    exit 1
  fi
fi
echo "✓ Dependencies OK"
echo ""

# Fetch existing color analyses to skip
echo "Fetching existing color analyses..."
existing_ids=()
if [ $FORCE -eq 0 ]; then
  cursor=0
  while true; do
    resp=$(curl -sS "${BASE_WORKER}/results?limit=200&cursor=${cursor}&model=color-analyzer" \
      -H "Authorization: Bearer $TOKEN")
    
    # Extract image IDs from response
    ids=$(echo "$resp" | python3 -c "import sys, json; data=json.load(sys.stdin); print(' '.join([item['image_id'] for item in data.get('items', [])]))" 2>/dev/null)
    
    if [ -n "$ids" ]; then
      existing_ids+=("${(@s/ /)ids}")
    fi
    
    # Check if there's more data
    next_cursor=$(echo "$resp" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('nextCursor', ''))" 2>/dev/null)
    items_count=$(echo "$resp" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('items', [])))" 2>/dev/null)
    
    if [ -z "$next_cursor" ] || [ "$items_count" = "0" ]; then
      break
    fi
    cursor=$next_cursor
  done
  echo "Found ${#existing_ids[@]} existing analyses"
else
  echo "Force mode: will reprocess all images"
fi
echo ""

# Process each page
for (( p = START_PAGE; p <= END_PAGE; p++ )); do
  page_start=$(date +%s)
  echo "Page $p/$END_PAGE ..."
  
  # Fetch images directly from Cloudflare Images API
  resp=$(curl -sS "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1?per_page=${PER_PAGE}&page=$p" \
    -H "Authorization: Bearer ${CF_API_TOKEN}")
  
  # Parse image IDs and variants from Cloudflare Images API response
  images=$(echo "$resp" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    result = data.get('result', {})
    imgs = result.get('images', [])
    
    for img in imgs:
        image_id = img.get('id', '')
        variants = img.get('variants', [])
        
        if not image_id or not variants:
            continue
        
        # Find 160contain and 480contain variants
        analyze_url = ''
        store_url = ''
        
        for v in variants:
            if '160contain' in v:
                analyze_url = v
            elif '480contain' in v:
                store_url = v
        
        # Fallback if specific variants not found
        if not analyze_url:
            for v in variants:
                if 'contain' in v:
                    analyze_url = v
                    break
        if not store_url:
            store_url = analyze_url if analyze_url else (variants[0] if variants else '')
        if not analyze_url:
            analyze_url = store_url
        
        if image_id and analyze_url and store_url:
            print(f\"{image_id}||{analyze_url}||{store_url}\")
except Exception as e:
    print(f\"Error: {e}\", file=sys.stderr)
" 2>/dev/null)
  
  if [ -z "$images" ]; then
    echo "  No images found on this page"
    break
  fi
  
  # Process each image
  while IFS= read -r line; do
    if [ -z "$line" ]; then
      continue
    fi
    
    # Parse: image_id||analyze_url||store_url
    image_id="${line%%||*}"
    rest="${line#*||}"
    analyze_url="${rest%%||*}"
    store_url="${rest#*||}"
    
    total_processed=$((total_processed + 1))
    
    # Skip if already analyzed (unless force mode)
    if [ $FORCE -eq 0 ] && [[ " ${existing_ids[@]} " =~ " ${image_id} " ]]; then
      total_skipped=$((total_skipped + 1))
      continue
    fi
    
    # Analyze image locally
    echo -n "  Analyzing $image_id ... "
    
    # Run Python script with small variant and capture output
    analysis=$(python3 analyze_colors_local.py "$image_id" "$analyze_url" 2>"$ERRORS_FILE.tmp")
    
    if [ $? -eq 0 ]; then
      # Parse colors from output
      colors=$(echo "$analysis" | awk '/Color analysis:/,0' | tail -n +2 | python3 -c "
import sys, json
colors = {}
for line in sys.stdin:
    if ':' in line:
        parts = line.strip().split(':')
        if len(parts) == 2:
            color = parts[0].strip()
            percent = parts[1].strip().rstrip('%')
            try:
                colors[color] = float(percent) / 100.0
            except:
                pass
print(json.dumps(colors))
" 2>/dev/null)
      
      # Upload result with standard variant URL for display consistency
      upload_resp=$(curl -sS -X POST "${BASE_WORKER}/upload" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"image_id\":\"$image_id\",\"image_url\":\"$store_url\",\"colors\":$colors}")
      
      upload_ok=$(echo "$upload_resp" | python3 -c "import sys, json; print(json.load(sys.stdin).get('ok', False))" 2>/dev/null)
      
      if [ "$upload_ok" = "True" ]; then
        echo "✓"
        total_uploaded=$((total_uploaded + 1))
        echo "$upload_resp" >> "$RESULTS_FILE"
      else
        echo "✗ upload failed"
        total_errors=$((total_errors + 1))
        echo "$upload_resp" >> "$ERRORS_FILE"
      fi
    else
      echo "✗ analysis failed"
      total_errors=$((total_errors + 1))
      cat "$ERRORS_FILE.tmp" >> "$ERRORS_FILE"
    fi
    
    # Clean up temp error file
    rm -f "$ERRORS_FILE.tmp"
    
  done <<< "$images"
  
  # Page summary
  page_end=$(date +%s)
  page_duration=$((page_end - page_start))
  elapsed=$((page_end - start_time))
  
  echo "  Page complete in ${page_duration}s"
  echo "  TOTALS: $total_processed processed, $total_uploaded uploaded, $total_skipped skipped, $total_errors errors"
  echo ""
  
  # Small delay between pages
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
echo "  Successfully uploaded: $total_uploaded"
echo "  Skipped (already analyzed): $total_skipped"
echo "  Errors: $total_errors"
echo ""
echo "Results saved to: $RESULTS_FILE"
if [ $total_errors -gt 0 ]; then
  echo "Errors logged to: $ERRORS_FILE"
fi
echo "=================================="
