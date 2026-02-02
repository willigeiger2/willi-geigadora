#!/usr/bin/env python3
"""
Analyze all local test images and output human-readable color results.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np
import colorsys

# Import color definitions and functions from analyze_colors_local
from analyze_colors_local import COLORS_HSV, rgb_to_hsv, score_color_match

def analyze_local_image(image_path: Path):
    """
    Analyze colors in a local image file using HSV color space
    Returns a dict of color scores (0-1)
    """
    try:
        # Open image
        img = Image.open(image_path)
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize to reasonable size for sampling (max 400px on longest side)
        max_size = 400
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Get all pixels as numpy array
        pixels = np.array(img)
        
        # Flatten to list of RGB tuples
        pixel_list = pixels.reshape(-1, 3)
        
        # Sample pixels (use all if reasonable, otherwise sample)
        if len(pixel_list) > 10000:
            # Sample 10000 pixels uniformly
            indices = np.linspace(0, len(pixel_list) - 1, 10000, dtype=int)
            pixel_list = pixel_list[indices]
        
        # Convert all pixels to HSV
        hsv_list = [rgb_to_hsv(pixel) for pixel in pixel_list]
        
        # Score each color
        scores = {color_name: 0.0 for color_name in COLORS_HSV.keys()}
        
        for hsv in hsv_list:
            for color_name, color_def in COLORS_HSV.items():
                score = score_color_match(hsv, color_name, color_def)
                scores[color_name] += score
        
        # Average scores across all pixels
        for color_name in scores:
            scores[color_name] /= len(hsv_list)
        
        # Normalize scores to sum to 1
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        else:
            # Fallback to uniform if something went wrong
            scores = {k: 1.0 / len(COLORS_HSV) for k in COLORS_HSV.keys()}
        
        return scores
        
    except Exception as e:
        print(f"Error analyzing {image_path.name}: {e}", file=sys.stderr)
        return None

def format_bar(score: float, width: int = 30) -> str:
    """Create a visual bar chart for a score."""
    filled = int(score * width)
    bar = '█' * filled + '░' * (width - filled)
    return bar

def main():
    """Analyze all images in test_images directory."""
    test_dir = Path(__file__).parent / "test_images"
    
    if not test_dir.exists():
        print(f"Error: {test_dir} does not exist")
        sys.exit(1)
    
    # Find all image files
    image_files = sorted(test_dir.glob("*.jpg")) + sorted(test_dir.glob("*.png"))
    
    if not image_files:
        print(f"No images found in {test_dir}")
        sys.exit(1)
    
    print(f"Analyzing {len(image_files)} images in {test_dir}/\n")
    print("=" * 80)
    
    for image_path in image_files:
        print(f"\n{image_path.stem}")
        print("-" * 80)
        
        scores = analyze_local_image(image_path)
        
        if scores:
            # Sort by score (highest first)
            sorted_colors = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            
            # Print each color with bar chart and percentage
            for color, score in sorted_colors:
                bar = format_bar(score)
                percentage = score * 100
                print(f"  {color:8s} {bar} {percentage:5.1f}%")
        else:
            print("  ✗ Failed to analyze")
    
    print("\n" + "=" * 80)

if __name__ == '__main__':
    main()
