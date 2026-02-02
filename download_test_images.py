#!/usr/bin/env python3
"""Download test images for color analyzer development."""

import os
import re
import requests
from pathlib import Path

# Image mappings from COLOR_TEST_IMAGES.md
IMAGES = [
    ("09bc80fb-6931-4806-5927-33c2a7400400", "orangeSky-01"),
    ("3b05e848-cf81-40f4-c6a1-b97a3eba5900", "purpleDragon"),
    ("bd76c2c2-72bb-41b4-fdf9-20fe151b6000", "blueGreenEye"),
    ("3f8e5af9-1495-4c85-0360-cd224bd06700", "yellowBlueElephant"),
    ("72d6958f-1bf0-47ce-7d32-396cd733fc00", "yellowOaxacaHouse"),
    ("22936398-922b-4fb6-66c1-3da4bb9fd200", "yellowVaulting"),
    ("c310aed7-4537-416c-4551-c44ee0266c00", "yellowBrownGiraffe"),
    ("5429c930-653c-4fb6-1012-fe54e0c39800", "pinkPurpleFlowers"),
    ("bc5e9193-242a-4988-1a48-4e721019eb00", "greenBelize"),
    ("8cd710f0-5d65-4f0a-9127-c8fa35a86500", "pinkBaby"),
    ("9bd05725-d996-48e0-0e5d-144b77020500", "greenBeachHill"),
    ("4680141d-0397-4010-4442-630674978900", "pinkBlosson"),
    ("2ed81dca-930f-442e-85a8-a058a10ec900", "yellowSerengeti"),
    ("444415da-c0dc-4ee0-8675-b48f37f96300", "orangeSidewalkClosed"),
    ("644dee84-b2b9-4975-6d8b-5911276ebf00", "greenBackground"),
    ("5cf7dfb9-b7c1-47e2-2eec-4c0a0b899600", "greenLakeside"),
    ("f5481459-d845-4fcc-941a-55ebd746dd00", "greenZebraField"),
    ("df0a4e6d-9d6a-42f5-4803-cfc1ea03df00", "pinkFlamingos"),
    ("03eacf3d-5dfe-4e23-9fb1-3c31694fae00", "brownLogs"),
]

# Cloudflare API config
CF_ACCOUNT_ID = "3ce0a7682b4404afc52b42b6af1152b4"

def get_cf_token():
    """Read Cloudflare Images token from .env file."""
    env_path = Path(__file__).parent / ".env"
    try:
        env_content = env_path.read_text()
        match = re.search(r'CLOUDFLARE_IMAGES_TOKEN=(.+)', env_content)
        if match:
            return match.group(1).strip()
    except Exception as e:
        print(f"Error reading .env: {e}")
    return None

def get_image_variants(image_id: str, cf_token: str) -> list:
    """Fetch image details from Cloudflare Images API."""
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/images/v1/{image_id}"
    headers = {"Authorization": f"Bearer {cf_token}"}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('result', {}).get('variants', [])
    except Exception:
        pass
    return []

def download_image(image_id: str, filename: str, output_dir: Path, cf_token: str):
    """Download the smallest variant of an image."""
    output_path = output_dir / f"{filename}.jpg"
    
    # Get variants from API
    variants = get_image_variants(image_id, cf_token)
    
    if not variants:
        print(f"✗ {filename} - No variants found")
        return False
    
    # Find smallest variant (prefer 160contain, then 240contain, then 320contain)
    preferred_variants = ["160contain", "240contain", "320contain", "480contain"]
    url = None
    
    for pref in preferred_variants:
        for variant in variants:
            if pref in variant:
                url = variant
                break
        if url:
            break
    
    # Fallback to first variant if no preferred one found
    if not url and variants:
        url = variants[0]
    
    if not url:
        print(f"✗ {filename} - No suitable variant")
        return False
    
    # Download the image
    try:
        print(f"Downloading {filename}... ", end="", flush=True)
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            output_path.write_bytes(response.content)
            print(f"✓ ({len(response.content) // 1024}KB)")
            return True
        else:
            print(f"✗ (HTTP {response.status_code})")
    except Exception as e:
        print(f"✗ ({e})")
    
    return False

def main():
    """Download all test images."""
    # Get Cloudflare token
    cf_token = get_cf_token()
    if not cf_token:
        print("Error: Could not read CLOUDFLARE_IMAGES_TOKEN from .env file")
        return
    
    output_dir = Path(__file__).parent / "test_images"
    output_dir.mkdir(exist_ok=True)
    
    print(f"Downloading {len(IMAGES)} test images to {output_dir}/\n")
    
    success_count = 0
    for image_id, filename in IMAGES:
        if download_image(image_id, filename, output_dir, cf_token):
            success_count += 1
    
    print(f"\nDownloaded {success_count}/{len(IMAGES)} images successfully")

if __name__ == "__main__":
    main()
