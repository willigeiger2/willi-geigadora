# Image Classification Analysis Report

**Generated:** 1/23/2026, 9:57:29 PM
**Model:** @cf/llava-hf/llava-1.5-7b-hf

---

## Summary

- **Total Images Classified:** 601
- **High Confidence (≥0.8):** 502 (83.5%)
- **Low Confidence (<0.6):** 51 (8.5%)
- **No Strong Label (<0.5):** 26 (4.3%)
- **Multi-Label Images (≥2 labels >0.6):** 479 (79.7%)

## Category Distribution

Images with confidence above threshold:

| Category | ≥0.5 | ≥0.6 | ≥0.7 | ≥0.8 | ≥0.9 | Avg Score |
|----------|------|------|------|------|------|----------|
| People | 131 | 52 | 37 | 30 | 23 | 0.168 |
| Pets | 74 | 55 | 55 | 54 | 54 | 0.117 |
| Wildlife | 135 | 126 | 126 | 126 | 126 | 0.225 |
| Landscape | 240 | 213 | 209 | 207 | 203 | 0.388 |
| Urban | 155 | 128 | 127 | 127 | 123 | 0.242 |
| Architecture | 236 | 197 | 192 | 188 | 171 | 0.359 |
| Vehicles | 38 | 26 | 26 | 26 | 25 | 0.060 |
| Food | 13 | 4 | 1 | 1 | 1 | 0.019 |
| Night | 24 | 14 | 14 | 14 | 14 | 0.038 |
| Macro | 374 | 323 | 319 | 318 | 315 | 0.599 |
| Indoor | 16 | 7 | 7 | 7 | 7 | 0.026 |
| Outdoor | 553 | 503 | 492 | 486 | 478 | 0.867 |
| Portraits | 291 | 215 | 206 | 205 | 198 | 0.439 |

## Score Distribution by Category

Visual representation of how many images fall into each confidence range:

### People

Total images: 601

```
0.0-0.2: ██████████████████████████████████████████ 420
0.2-0.4: ███ 22
0.4-0.6: ███████████ 107
0.6-0.8: ███ 22
0.8-1.0: ███ 30
```

### Pets

Total images: 601

```
0.0-0.2: ████████████████████████████████████████████████████ 514
0.2-0.4: █ 9
0.4-0.6: ███ 23
0.6-0.8: █ 1
0.8-1.0: ██████ 54
```

### Wildlife

Total images: 601

```
0.0-0.2: ██████████████████████████████████████████████ 457
0.2-0.4: █ 6
0.4-0.6: ██ 12
0.6-0.8:  0
0.8-1.0: █████████████ 126
```

### Landscape

Total images: 601

```
0.0-0.2: ██████████████████████████████████ 333
0.2-0.4: ███ 22
0.4-0.6: ████ 33
0.6-0.8: █ 6
0.8-1.0: █████████████████████ 207
```

### Urban

Total images: 601

```
0.0-0.2: ███████████████████████████████████████████ 430
0.2-0.4: ██ 13
0.4-0.6: ███ 30
0.6-0.8: █ 1
0.8-1.0: █████████████ 127
```

### Architecture

Total images: 601

```
0.0-0.2: ███████████████████████████████████ 350
0.2-0.4: █ 10
0.4-0.6: █████ 44
0.6-0.8: █ 9
0.8-1.0: ███████████████████ 188
```

### Vehicles

Total images: 601

```
0.0-0.2: ████████████████████████████████████████████████████████ 557
0.2-0.4: █ 5
0.4-0.6: ██ 13
0.6-0.8:  0
0.8-1.0: ███ 26
```

### Food

Total images: 601

```
0.0-0.2: ███████████████████████████████████████████████████████████ 582
0.2-0.4: █ 5
0.4-0.6: █ 10
0.6-0.8: █ 3
0.8-1.0: █ 1
```

### Night

Total images: 601

```
0.0-0.2: ██████████████████████████████████████████████████████████ 571
0.2-0.4: █ 5
0.4-0.6: ██ 11
0.6-0.8:  0
0.8-1.0: ██ 14
```

### Macro

Total images: 601

```
0.0-0.2: ███████████████████ 185
0.2-0.4: ████ 35
0.4-0.6: ██████ 58
0.6-0.8: █ 5
0.8-1.0: ████████████████████████████████ 318
```

### Indoor

Total images: 601

```
0.0-0.2: ██████████████████████████████████████████████████████████ 579
0.2-0.4: █ 5
0.4-0.6: █ 10
0.6-0.8:  0
0.8-1.0: █ 7
```

### Outdoor

Total images: 601

```
0.0-0.2: ████ 39
0.2-0.4: █ 4
0.4-0.6: ██████ 55
0.6-0.8: ██ 17
0.8-1.0: █████████████████████████████████████████████████ 486
```

### Portraits

Total images: 601

```
0.0-0.2: ████████████████████████████ 271
0.2-0.4: ██ 20
0.4-0.6: ██████████ 95
0.6-0.8: █ 10
0.8-1.0: █████████████████████ 205
```

## Problematic Cases

### Low Confidence Images (< 0.6)

These images may need manual review or indicate categories the model struggles with:

- [`fab399be-525f-4839-249e-57f63507a700`](/photography/fab399be-525f-4839-249e-57f63507a700) - People (0.500)
- [`0394bf2c-33d1-46f7-d16b-ae2e0bb0be00`](/photography/0394bf2c-33d1-46f7-d16b-ae2e0bb0be00) - People (0.500)
- [`3b05e848-cf81-40f4-c6a1-b97a3eba5900`](/photography/3b05e848-cf81-40f4-c6a1-b97a3eba5900) - People (0.500)
- [`cbb4aa01-0418-4dca-02c8-026232feae00`](/photography/cbb4aa01-0418-4dca-02c8-026232feae00) - People (0.500)
- [`d2b32118-4e1c-4824-40f6-421cd2bd4d00`](/photography/d2b32118-4e1c-4824-40f6-421cd2bd4d00) - People (0.500)
- [`f077160e-fd7c-43e8-b960-4f4cbe67e900`](/photography/f077160e-fd7c-43e8-b960-4f4cbe67e900) - People (0.500)
- [`bc5e9193-242a-4988-1a48-4e721019eb00`](/photography/bc5e9193-242a-4988-1a48-4e721019eb00) - People (0.500)
- [`271c9f7b-4e80-4330-3efb-1195c965f300`](/photography/271c9f7b-4e80-4330-3efb-1195c965f300) - People (0.500)
- [`fe829b2e-1949-4558-43aa-4cf016877900`](/photography/fe829b2e-1949-4558-43aa-4cf016877900) - People (0.500)
- [`e07e902c-cb79-4a84-eb06-ea4638c2e100`](/photography/e07e902c-cb79-4a84-eb06-ea4638c2e100) - People (0.500)

_...and 41 more_

### No Strong Label (< 0.5 in all categories)

These images don't fit well into any category:

- [`ba6451d4-61ee-4358-5d8c-0c5cf2212c00`](/photography/ba6451d4-61ee-4358-5d8c-0c5cf2212c00) - best: People (0.400)
- [`c5d1df5a-6a98-47c4-6cad-1299b66e8300`](/photography/c5d1df5a-6a98-47c4-6cad-1299b66e8300) - best: People (0.100)
- [`288578a8-26a3-4e1a-6a76-22d77e391700`](/photography/288578a8-26a3-4e1a-6a76-22d77e391700) - best: People (0.300)
- [`1df9a5aa-3850-4d6b-3006-dde6cd3e1000`](/photography/1df9a5aa-3850-4d6b-3006-dde6cd3e1000) - best: People (0.100)
- [`56790934-0846-4b7d-9126-e51e24e10700`](/photography/56790934-0846-4b7d-9126-e51e24e10700) - best: Architecture (0.400)
- [`d5e23dd3-b50b-429d-c391-72f9b4321000`](/photography/d5e23dd3-b50b-429d-c391-72f9b4321000) - best: People (0.400)
- [`78a3b858-a33d-4f51-1021-4397436a0400`](/photography/78a3b858-a33d-4f51-1021-4397436a0400) - best: People (0.100)
- [`e736675b-6565-4d29-aaa0-48d58bcfd200`](/photography/e736675b-6565-4d29-aaa0-48d58bcfd200) - best: People (0.300)
- [`b9ae14d2-a4ad-48df-6b78-563766d8df00`](/photography/b9ae14d2-a4ad-48df-6b78-563766d8df00) - best: null (0.000)
- [`5f7e58cc-9ccd-48e9-33cc-f046f113d000`](/photography/5f7e58cc-9ccd-48e9-33cc-f046f113d000) - best: null (0.000)

_...and 16 more_

### Multi-Label Images

These images have multiple strong classifications (may indicate overlapping concepts):

- [`b4bd2625-6445-4513-4e08-dbd13aed0800`](/photography/b4bd2625-6445-4513-4e08-dbd13aed0800) - Landscape(1.00), Macro(1.00), Outdoor(1.00)
- [`09bc80fb-6931-4806-5927-33c2a7400400`](/photography/09bc80fb-6931-4806-5927-33c2a7400400) - Pets(1.00), Urban(1.00), Architecture(1.00), Vehicles(1.00), Outdoor(1.00), Portraits(1.00)
- [`d34e3e00-0427-4c87-5889-956df539fa00`](/photography/d34e3e00-0427-4c87-5889-956df539fa00) - Landscape(1.00), Architecture(1.00), Macro(1.00), Outdoor(1.00)
- [`4d0206d9-6cf1-43c3-8ed7-09bd037f9f00`](/photography/4d0206d9-6cf1-43c3-8ed7-09bd037f9f00) - Landscape(1.00), Architecture(1.00), Macro(1.00), Outdoor(1.00)
- [`e916af6d-76c3-4c00-c672-9f79bed4c400`](/photography/e916af6d-76c3-4c00-c672-9f79bed4c400) - Urban(0.95), Architecture(0.95), Macro(0.95), Outdoor(0.95)
- [`703755de-6f62-4ae6-bb5e-656c5852df00`](/photography/703755de-6f62-4ae6-bb5e-656c5852df00) - Architecture(1.00), Macro(1.00), Outdoor(1.00)
- [`0300918f-36a9-4b00-d356-5732ae199500`](/photography/0300918f-36a9-4b00-d356-5732ae199500) - People(0.75), Outdoor(0.75)
- [`a3328978-7576-49f1-4cfc-5900b2cdcc00`](/photography/a3328978-7576-49f1-4cfc-5900b2cdcc00) - Landscape(1.00), Outdoor(1.00)
- [`4d18b3e3-9760-404c-00b4-c5e88610e200`](/photography/4d18b3e3-9760-404c-00b4-c5e88610e200) - Urban(1.00), Architecture(1.00), Outdoor(1.00)
- [`a9e0bf1a-bd08-4a01-a6eb-fa5f4a4d6b00`](/photography/a9e0bf1a-bd08-4a01-a6eb-fa5f4a4d6b00) - Landscape(1.00), Macro(1.00), Outdoor(1.00)

_...and 469 more_

## Recommendations

1. **Review High-Confidence Images:** Browse category pages to verify the model's top picks
2. **Investigate Low-Confidence Cases:** Look at images the model was uncertain about
3. **Refine Label Hints:** If categories overlap too much, consider adding more specific hints
4. **Adjust Thresholds:** Current pages use minScore=0.6, adjust if needed

## Quick Links

- [All Images](/photography/all)
- [People](/photography/people) | [Pets](/photography/pets) | [Wildlife](/photography/wildlife)
- [Landscape](/photography/landscape) | [Urban](/photography/urban) | [Architecture](/photography/architecture)
- [Vehicles](/photography/vehicles) | [Food](/photography/food) | [Night](/photography/night)
- [Macro](/photography/macro) | [Portraits](/photography/portraits)
- [Indoor](/photography/interiors) | [Misc](/photography/misc)

---

_Generated by analyze_classifications.js_
