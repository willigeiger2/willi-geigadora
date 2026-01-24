#!/usr/bin/env node

/**
 * Analysis script for image classification results
 * Fetches all classification data and generates detailed statistics
 */

const https = require('https');
const fs = require('fs');

const TOKEN = 'd8uWzRrb-qRBNOFCiKyAaq2UgnwLMU8DUUb8Fzly';
const BASE = 'image-classifier-worker.willigeiger.workers.dev';
const MODEL = '@cf/llava-hf/llava-1.5-7b-hf';

const CATEGORIES = [
  'People', 'Pets', 'Wildlife', 'Landscape', 'Urban', 
  'Architecture', 'Vehicles', 'Food', 'Night', 'Macro', 
  'Indoor', 'Outdoor', 'Portraits'
];

const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9];

// Fetch all results from the API
async function fetchAllResults() {
  const allItems = [];
  let cursor = 0;
  let page = 0;
  
  console.log('Fetching classification results...\n');
  
  while (true) {
    page++;
    const modelEncoded = encodeURIComponent(MODEL);
    const path = `/results?cursor=${cursor}&limit=200&model=${modelEncoded}`;
    
    process.stdout.write(`Page ${page}: `);
    
    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: BASE,
        path: path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json'
        }
      };
      
      https.get(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        });
      }).on('error', reject);
    });
    
    if (!data.items || data.items.length === 0) {
      console.log('no items, stopping');
      break;
    }
    
    console.log(`fetched ${data.items.length} items (total: ${allItems.length + data.items.length})`);
    
    allItems.push(...data.items);
    
    if (!data.nextCursor || data.nextCursor === cursor) {
      break;
    }
    
    cursor = data.nextCursor;
  }
  
  console.log(`\nTotal fetched: ${allItems.length} classifications\n`);
  return allItems;
}

// Analyze the results
function analyzeResults(items) {
  const stats = {
    total: items.length,
    byCategory: {},
    scoreDistribution: {},
    lowConfidence: [],
    highConfidence: [],
    multiLabel: [],
    noStrongLabel: []
  };
  
  // Initialize category stats
  CATEGORIES.forEach(cat => {
    stats.byCategory[cat] = {
      counts: {},
      scores: [],
      avgScore: 0
    };
    THRESHOLDS.forEach(t => {
      stats.byCategory[cat].counts[t] = 0;
    });
  });
  
  // Process each item
  items.forEach(item => {
    if (!item.model_top || !Array.isArray(item.model_top)) return;
    
    const scores = {};
    let maxScore = 0;
    let maxLabel = null;
    let strongLabels = [];
    
    item.model_top.forEach(labelObj => {
      const { label, score } = labelObj;
      if (!CATEGORIES.includes(label)) return;
      
      scores[label] = score;
      
      // Track max
      if (score > maxScore) {
        maxScore = score;
        maxLabel = label;
      }
      
      // Track strong labels (>= 0.6)
      if (score >= 0.6) {
        strongLabels.push({ label, score });
      }
      
      // Update category stats
      stats.byCategory[label].scores.push(score);
      THRESHOLDS.forEach(threshold => {
        if (score >= threshold) {
          stats.byCategory[label].counts[threshold]++;
        }
      });
    });
    
    // Categorize this image
    if (maxScore < 0.5) {
      stats.noStrongLabel.push({
        image_id: item.image_id,
        image_url: item.image_url,
        maxScore,
        maxLabel
      });
    } else if (maxScore >= 0.8) {
      stats.highConfidence.push({
        image_id: item.image_id,
        image_url: item.image_url,
        label: maxLabel,
        score: maxScore
      });
    } else if (maxScore < 0.6) {
      stats.lowConfidence.push({
        image_id: item.image_id,
        image_url: item.image_url,
        label: maxLabel,
        score: maxScore
      });
    }
    
    // Multi-label check (multiple categories > 0.6)
    if (strongLabels.length > 1) {
      stats.multiLabel.push({
        image_id: item.image_id,
        image_url: item.image_url,
        labels: strongLabels
      });
    }
  });
  
  // Calculate averages
  CATEGORIES.forEach(cat => {
    const scores = stats.byCategory[cat].scores;
    if (scores.length > 0) {
      stats.byCategory[cat].avgScore = 
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  });
  
  return stats;
}

// Generate markdown report
function generateReport(stats) {
  const timestamp = new Date().toISOString();
  const filename = `classification_report_${timestamp.replace(/[:.]/g, '-').slice(0, -5)}.md`;
  
  let md = `# Image Classification Analysis Report\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n`;
  md += `**Model:** ${MODEL}\n\n`;
  md += `---\n\n`;
  
  md += `## Summary\n\n`;
  md += `- **Total Images Classified:** ${stats.total}\n`;
  md += `- **High Confidence (≥0.8):** ${stats.highConfidence.length} (${(stats.highConfidence.length/stats.total*100).toFixed(1)}%)\n`;
  md += `- **Low Confidence (<0.6):** ${stats.lowConfidence.length} (${(stats.lowConfidence.length/stats.total*100).toFixed(1)}%)\n`;
  md += `- **No Strong Label (<0.5):** ${stats.noStrongLabel.length} (${(stats.noStrongLabel.length/stats.total*100).toFixed(1)}%)\n`;
  md += `- **Multi-Label Images (≥2 labels >0.6):** ${stats.multiLabel.length} (${(stats.multiLabel.length/stats.total*100).toFixed(1)}%)\n\n`;
  
  md += `## Category Distribution\n\n`;
  md += `Images with confidence above threshold:\n\n`;
  md += `| Category | ≥0.5 | ≥0.6 | ≥0.7 | ≥0.8 | ≥0.9 | Avg Score |\n`;
  md += `|----------|------|------|------|------|------|----------|\n`;
  
  CATEGORIES.forEach(cat => {
    const c = stats.byCategory[cat];
    md += `| ${cat} | ${c.counts[0.5] || 0} | ${c.counts[0.6] || 0} | ${c.counts[0.7] || 0} | ${c.counts[0.8] || 0} | ${c.counts[0.9] || 0} | ${c.avgScore.toFixed(3)} |\n`;
  });
  
  md += `\n## Score Distribution by Category\n\n`;
  md += `Visual representation of how many images fall into each confidence range:\n\n`;
  
  CATEGORIES.forEach(cat => {
    const c = stats.byCategory[cat];
    if (c.scores.length === 0) return;
    
    md += `### ${cat}\n\n`;
    md += `Total images: ${c.scores.length}\n\n`;
    
    // Create histogram
    const buckets = [0, 0, 0, 0, 0]; // 0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0
    c.scores.forEach(score => {
      const idx = Math.min(4, Math.floor(score * 5));
      buckets[idx]++;
    });
    
    md += '```\n';
    ['0.0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'].forEach((range, i) => {
      const count = buckets[i];
      const bar = '█'.repeat(Math.ceil(count / 10));
      md += `${range}: ${bar} ${count}\n`;
    });
    md += '```\n\n';
  });
  
  md += `## Problematic Cases\n\n`;
  
  md += `### Low Confidence Images (< 0.6)\n\n`;
  if (stats.lowConfidence.length > 0) {
    md += `These images may need manual review or indicate categories the model struggles with:\n\n`;
    stats.lowConfidence.slice(0, 10).forEach(img => {
      md += `- [\`${img.image_id}\`](/photography/${img.image_id}) - ${img.label} (${img.score.toFixed(3)})\n`;
    });
    if (stats.lowConfidence.length > 10) {
      md += `\n_...and ${stats.lowConfidence.length - 10} more_\n`;
    }
  } else {
    md += `None found! 🎉\n`;
  }
  md += `\n`;
  
  md += `### No Strong Label (< 0.5 in all categories)\n\n`;
  if (stats.noStrongLabel.length > 0) {
    md += `These images don't fit well into any category:\n\n`;
    stats.noStrongLabel.slice(0, 10).forEach(img => {
      md += `- [\`${img.image_id}\`](/photography/${img.image_id}) - best: ${img.maxLabel} (${img.maxScore.toFixed(3)})\n`;
    });
    if (stats.noStrongLabel.length > 10) {
      md += `\n_...and ${stats.noStrongLabel.length - 10} more_\n`;
    }
  } else {
    md += `None found!\n`;
  }
  md += `\n`;
  
  md += `### Multi-Label Images\n\n`;
  if (stats.multiLabel.length > 0) {
    md += `These images have multiple strong classifications (may indicate overlapping concepts):\n\n`;
    stats.multiLabel.slice(0, 10).forEach(img => {
      const labelStr = img.labels.map(l => `${l.label}(${l.score.toFixed(2)})`).join(', ');
      md += `- [\`${img.image_id}\`](/photography/${img.image_id}) - ${labelStr}\n`;
    });
    if (stats.multiLabel.length > 10) {
      md += `\n_...and ${stats.multiLabel.length - 10} more_\n`;
    }
  } else {
    md += `None found.\n`;
  }
  md += `\n`;
  
  md += `## Recommendations\n\n`;
  md += `1. **Review High-Confidence Images:** Browse category pages to verify the model's top picks\n`;
  md += `2. **Investigate Low-Confidence Cases:** Look at images the model was uncertain about\n`;
  md += `3. **Refine Label Hints:** If categories overlap too much, consider adding more specific hints\n`;
  md += `4. **Adjust Thresholds:** Current pages use minScore=0.6, adjust if needed\n\n`;
  
  md += `## Quick Links\n\n`;
  md += `- [All Images](/photography/all)\n`;
  md += `- [People](/photography/people) | [Pets](/photography/pets) | [Wildlife](/photography/wildlife)\n`;
  md += `- [Landscape](/photography/landscape) | [Urban](/photography/urban) | [Architecture](/photography/architecture)\n`;
  md += `- [Vehicles](/photography/vehicles) | [Food](/photography/food) | [Night](/photography/night)\n`;
  md += `- [Macro](/photography/macro) | [Portraits](/photography/portraits)\n`;
  md += `- [Indoor](/photography/interiors) | [Misc](/photography/misc)\n\n`;
  
  md += `---\n\n`;
  md += `_Generated by analyze_classifications.js_\n`;
  
  fs.writeFileSync(filename, md);
  return filename;
}

// Main execution
async function main() {
  try {
    const items = await fetchAllResults();
    
    if (items.length === 0) {
      console.log('No classification results found!');
      console.log('Run the batch script first: ./run_batch.zsh');
      process.exit(1);
    }
    
    console.log('Analyzing results...\n');
    const stats = analyzeResults(items);
    
    console.log('Generating report...\n');
    const reportFile = generateReport(stats);
    
    console.log('✓ Analysis complete!\n');
    console.log(`Report saved to: ${reportFile}\n`);
    console.log('Quick stats:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  High confidence (≥0.8): ${stats.highConfidence.length}`);
    console.log(`  Low confidence (<0.6): ${stats.lowConfidence.length}`);
    console.log(`  No strong label: ${stats.noStrongLabel.length}`);
    console.log(`  Multi-label: ${stats.multiLabel.length}`);
    console.log('');
    console.log('View report:');
    console.log(`  open ${reportFile}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
