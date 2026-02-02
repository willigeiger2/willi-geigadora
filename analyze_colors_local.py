#!/usr/bin/env python3
"""
Local color analyzer using Pillow
Analyzes images and uploads results to color-analyzer worker
Uses HSV color space for more accurate color perception
"""

import sys
import os
import json
import requests
from io import BytesIO
from PIL import Image
import numpy as np
import colorsys

# Color definitions in HSV (Hue 0-360, Saturation 0-1, Value 0-1)
# Hue values: Red=0, Orange=30, Yellow=60, Green=120, Blue=240, Purple=280
COLORS_HSV = {
    'Red': {'hue_center': 0, 'hue_range': 20},  # 345-15 degrees
    'Orange': {'hue_center': 20, 'hue_range': 20},  # 30-50 degrees  
    'Yellow': {'hue_center': 50, 'hue_range': 30},  # 40-80 degrees
    'Green': {'hue_center': 115, 'hue_range': 140},  # 70-170 degrees
    'Blue': {'hue_center': 220, 'hue_range': 100},  # 170-270 degrees
    'Purple': {'hue_center': 290, 'hue_range': 60},  # 260-320 degrees
    'Brown': {'hue_center': 25, 'hue_range': 40},  # 5-45 degrees, low saturation, low value
    'Black': {'value_max': 0.2},  # Low value (darkness)
    'White': {'saturation_max': 0.2, 'value_min': 0.8},  # Low saturation, high value
    'Gray': {'saturation_max': 0.2, 'value_min': 0.2, 'value_max': 0.8},  # Low saturation, mid value
    'Pink': {'hue_center': 310, 'hue_range': 100},  # Low saturation, mid value
}

def rgb_to_hsv(rgb):
    """Convert RGB (0-255) to HSV (H: 0-360, S: 0-1, V: 0-1)"""
    r, g, b = rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return h * 360, s, v  # Convert hue to degrees

def hue_distance(h1, h2):
    """Calculate shortest distance between two hues on color wheel (0-360)"""
    diff = abs(h1 - h2)
    if diff > 180:
        diff = 360 - diff
    return diff

def score_color_match(hsv, color_name, color_def):
    """Score how well a pixel matches a color category"""
    h, s, v = hsv
    
    # Special handling for achromatic colors (black, white, gray)
    if color_name == 'Black':
        # Black: very low value
        return 1.0 if v < 0.2 else max(0, (0.3 - v) / 0.3)
    
    elif color_name == 'White':
        # White: low saturation, high value
        if v < 0.7:
            return 0
        sat_score = max(0, (0.3 - s) / 0.3) if s < 0.3 else 0
        val_score = (v - 0.7) / 0.3
        return sat_score * val_score
    
    elif color_name == 'Gray':
        # Gray: low saturation, medium value
        if s > 0.3 or v < 0.15 or v > 0.85:
            return 0
        sat_score = max(0, (0.3 - s) / 0.3)
        # Peak at v=0.5, fall off towards black/white
        if v < 0.5:
            val_score = (v - 0.15) / 0.35
        else:
            val_score = (0.85 - v) / 0.35
        return sat_score * val_score
    
    elif color_name == 'Brown':
        # Brown: orange hue, lower saturation, lower value
        hue_center = color_def['hue_center']
        hue_range = color_def['hue_range']
        hue_diff = hue_distance(h, hue_center)
        
        if hue_diff > hue_range:
            return 0
        
        # Brown needs moderate saturation and low-medium value
        if s < 0.2 or s > 0.7 or v < 0.2 or v > 0.7:
            return 0
        
        hue_score = 1.0 - (hue_diff / hue_range)
        # Favor s=0.5, v=0.5
        sat_score = 1.0 - abs(s - 0.5) / 0.5
        val_score = 1.0 - abs(v - 0.5) / 0.5
        
        return hue_score * sat_score * val_score

    elif color_name == 'Pink':
        # Pink: red hue, lower saturation
        hue_center = color_def['hue_center']
        hue_range = color_def['hue_range']
        hue_diff = hue_distance(h, hue_center)
        
        # Outside hue range
        if hue_diff > hue_range:
            return 0
        
        # Pink needs high-medium value
        if s < 0.2 or v < 0.4:
            return 0
         
        hue_score = 1.0 - (hue_diff / hue_range)
        # Favor s=0.6, v=1.0
        sat_score = 1.0 - abs(s - 0.6) / 0.6
        val_score = (v - 0.4) / 0.6
        
        return hue_score * sat_score * val_score

    else:
        # Chromatic colors: check hue range, require minimum saturation
        hue_center = color_def['hue_center']
        hue_range = color_def['hue_range']
        hue_diff = hue_distance(h, hue_center)
        
        # Outside hue range
        if hue_diff > hue_range:
            return 0
        
        # Too desaturated or too dark
        if s < 0.2 or v < 0.1:
            return 0
        
        # Score based on hue match, saturation, and value
        hue_score = 1.0 - (hue_diff / hue_range)
        
        # Favor higher saturation for chromatic colors
        sat_score = (s - 0.2) / 0.8 if s > 0.2 else 0
        
        # Favor mid-high values
        val_score = 1.0#min(v / 0.1, 1.0) if v < 0.1 else 1.0
        
        return hue_score * sat_score * val_score

def analyze_image_colors(image_url):
    """
    Download and analyze colors in an image using HSV color space
    Returns a dict of color scores (0-1)
    """
    try:
        # Download image
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Open image
        img = Image.open(BytesIO(response.content))
        
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
        print(f"Error analyzing image: {e}", file=sys.stderr)
        return None

def upload_result(image_id, image_url, colors, token, base_url):
    """Upload color analysis result to worker"""
    try:
        response = requests.post(
            f"{base_url}/upload",
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            json={
                'image_id': image_id,
                'image_url': image_url,
                'colors': colors
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error uploading result: {e}", file=sys.stderr)
        return None

def main():
    """Analyze a single image (for testing)"""
    if len(sys.argv) < 3:
        print("Usage: python3 analyze_colors_local.py <image_id> <image_url>")
        sys.exit(1)
    
    image_id = sys.argv[1]
    image_url = sys.argv[2]
    
    print(f"Analyzing {image_id}...")
    colors = analyze_image_colors(image_url)
    
    if colors:
        # Print results
        print("\nColor analysis:")
        sorted_colors = sorted(colors.items(), key=lambda x: x[1], reverse=True)
        for color, score in sorted_colors:
            print(f"  {color}: {score*100:.1f}%")
    else:
        print("Failed to analyze image")
        sys.exit(1)

if __name__ == '__main__':
    main()
