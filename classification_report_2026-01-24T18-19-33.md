# Image Classification Analysis Report

**Generated:** 1/24/2026, 10:19:33 AM
**Model:** @cf/llava-hf/llava-1.5-7b-hf

---

## Summary

- **Total Images Classified:** 601
- **High Confidence (≥0.8):** 457 (76.0%)
- **Low Confidence (<0.6):** 67 (11.1%)
- **No Strong Label (<0.5):** 53 (8.8%)
- **Multi-Label Images (≥2 labels >0.6):** 383 (63.7%)

## Category Distribution

Images with confidence above threshold:

| Category | ≥0.5 | ≥0.6 | ≥0.7 | ≥0.8 | ≥0.9 | Avg Score |
|----------|------|------|------|------|------|----------|
| People | 125 | 54 | 38 | 31 | 23 | 0.166 |
| Pets | 70 | 54 | 54 | 54 | 54 | 0.115 |
| Wildlife | 133 | 126 | 126 | 126 | 126 | 0.223 |
| Landscape | 238 | 214 | 211 | 206 | 198 | 0.386 |
| Urban | 157 | 132 | 132 | 132 | 129 | 0.250 |
| Architecture | 227 | 187 | 185 | 183 | 171 | 0.352 |
| Vehicles | 37 | 27 | 26 | 26 | 24 | 0.060 |
| Food | 11 | 2 | 2 | 2 | 2 | 0.019 |
| Night | 23 | 15 | 15 | 15 | 15 | 0.039 |
| Macro | 369 | 319 | 318 | 316 | 311 | 0.595 |
| Interiors | 0 | 0 | 0 | 0 | 0 | 0.000 |
| Featured | 0 | 0 | 0 | 0 | 0 | 0.000 |

## Score Distribution by Category

Visual representation of how many images fall into each confidence range:

### People

Total images: 601

```
0.0-0.2: ███████████████████████████████████████████ 422
0.2-0.4: ███ 28
0.4-0.6: ██████████ 97
0.6-0.8: ███ 23
0.8-1.0: ████ 31
```

### Pets

Total images: 601

```
0.0-0.2: ████████████████████████████████████████████████████ 516
0.2-0.4: █ 10
0.4-0.6: ███ 21
0.6-0.8:  0
0.8-1.0: ██████ 54
```

### Wildlife

Total images: 601

```
0.0-0.2: ██████████████████████████████████████████████ 460
0.2-0.4: █ 7
0.4-0.6: █ 8
0.6-0.8:  0
0.8-1.0: █████████████ 126
```

### Landscape

Total images: 601

```
0.0-0.2: ██████████████████████████████████ 334
0.2-0.4: ███ 24
0.4-0.6: ███ 29
0.6-0.8: █ 8
0.8-1.0: █████████████████████ 206
```

### Urban

Total images: 601

```
0.0-0.2: ███████████████████████████████████████████ 422
0.2-0.4: ██ 17
0.4-0.6: ███ 30
0.6-0.8:  0
0.8-1.0: ██████████████ 132
```

### Architecture

Total images: 601

```
0.0-0.2: ████████████████████████████████████ 352
0.2-0.4: ██ 14
0.4-0.6: █████ 48
0.6-0.8: █ 4
0.8-1.0: ███████████████████ 183
```

### Vehicles

Total images: 601

```
0.0-0.2: ████████████████████████████████████████████████████████ 555
0.2-0.4: █ 8
0.4-0.6: ██ 11
0.6-0.8: █ 1
0.8-1.0: ███ 26
```

### Food

Total images: 601

```
0.0-0.2: ███████████████████████████████████████████████████████████ 581
0.2-0.4: █ 8
0.4-0.6: █ 10
0.6-0.8:  0
0.8-1.0: █ 2
```

### Night

Total images: 601

```
0.0-0.2: █████████████████████████████████████████████████████████ 570
0.2-0.4: █ 7
0.4-0.6: █ 9
0.6-0.8:  0
0.8-1.0: ██ 15
```

### Macro

Total images: 601

```
0.0-0.2: ███████████████████ 189
0.2-0.4: ████ 33
0.4-0.6: ██████ 60
0.6-0.8: █ 3
0.8-1.0: ████████████████████████████████ 316
```

## Problematic Cases

### Low Confidence Images (< 0.6)

These images may need manual review or indicate categories the model struggles with:

- [`fab399be-525f-4839-249e-57f63507a700`](/photography/fab399be-525f-4839-249e-57f63507a700) - People (0.500)
- [`0394bf2c-33d1-46f7-d16b-ae2e0bb0be00`](/photography/0394bf2c-33d1-46f7-d16b-ae2e0bb0be00) - People (0.500)
- [`2899e5bc-001d-46f6-03a5-1abc915d0a00`](/photography/2899e5bc-001d-46f6-03a5-1abc915d0a00) - People (0.500)
- [`cbb4aa01-0418-4dca-02c8-026232feae00`](/photography/cbb4aa01-0418-4dca-02c8-026232feae00) - People (0.500)
- [`d2b32118-4e1c-4824-40f6-421cd2bd4d00`](/photography/d2b32118-4e1c-4824-40f6-421cd2bd4d00) - People (0.500)
- [`ba6451d4-61ee-4358-5d8c-0c5cf2212c00`](/photography/ba6451d4-61ee-4358-5d8c-0c5cf2212c00) - People (0.500)
- [`b0897854-6ccc-44c0-7c66-7073ec3ca000`](/photography/b0897854-6ccc-44c0-7c66-7073ec3ca000) - Landscape (0.500)
- [`271c9f7b-4e80-4330-3efb-1195c965f300`](/photography/271c9f7b-4e80-4330-3efb-1195c965f300) - People (0.500)
- [`2bc18d6a-a740-413a-312f-612468257200`](/photography/2bc18d6a-a740-413a-312f-612468257200) - People (0.500)
- [`fe829b2e-1949-4558-43aa-4cf016877900`](/photography/fe829b2e-1949-4558-43aa-4cf016877900) - Food (0.500)

_...and 57 more_

### No Strong Label (< 0.5 in all categories)

These images don't fit well into any category:

- [`bd76c2c2-72bb-41b4-fdf9-20fe151b6000`](/photography/bd76c2c2-72bb-41b4-fdf9-20fe151b6000) - best: null (0.000)
- [`aca8ad31-7157-40cd-5c4e-3ff36dbd8500`](/photography/aca8ad31-7157-40cd-5c4e-3ff36dbd8500) - best: null (0.000)
- [`3b05e848-cf81-40f4-c6a1-b97a3eba5900`](/photography/3b05e848-cf81-40f4-c6a1-b97a3eba5900) - best: People (0.100)
- [`2e377abe-d940-479a-d96e-592d30326600`](/photography/2e377abe-d940-479a-d96e-592d30326600) - best: null (0.000)
- [`f077160e-fd7c-43e8-b960-4f4cbe67e900`](/photography/f077160e-fd7c-43e8-b960-4f4cbe67e900) - best: People (0.400)
- [`2b796baa-3455-43f4-35c9-13240ce0ad00`](/photography/2b796baa-3455-43f4-35c9-13240ce0ad00) - best: People (0.350)
- [`194de0b5-6a07-49dc-c13f-9e009db0fa00`](/photography/194de0b5-6a07-49dc-c13f-9e009db0fa00) - best: People (0.350)
- [`c5d1df5a-6a98-47c4-6cad-1299b66e8300`](/photography/c5d1df5a-6a98-47c4-6cad-1299b66e8300) - best: People (0.100)
- [`b38f586e-d9a7-4ad3-4ea1-7ede0a61ae00`](/photography/b38f586e-d9a7-4ad3-4ea1-7ede0a61ae00) - best: null (0.000)
- [`288578a8-26a3-4e1a-6a76-22d77e391700`](/photography/288578a8-26a3-4e1a-6a76-22d77e391700) - best: People (0.400)

_...and 43 more_

### Multi-Label Images

These images have multiple strong classifications (may indicate overlapping concepts):

- [`09bc80fb-6931-4806-5927-33c2a7400400`](/photography/09bc80fb-6931-4806-5927-33c2a7400400) - Pets(1.00), Urban(1.00), Architecture(1.00), Vehicles(1.00)
- [`d34e3e00-0427-4c87-5889-956df539fa00`](/photography/d34e3e00-0427-4c87-5889-956df539fa00) - Landscape(1.00), Architecture(1.00), Macro(1.00)
- [`4d0206d9-6cf1-43c3-8ed7-09bd037f9f00`](/photography/4d0206d9-6cf1-43c3-8ed7-09bd037f9f00) - Landscape(1.00), Architecture(1.00), Macro(1.00)
- [`e916af6d-76c3-4c00-c672-9f79bed4c400`](/photography/e916af6d-76c3-4c00-c672-9f79bed4c400) - Urban(0.95), Architecture(0.95), Macro(0.95)
- [`703755de-6f62-4ae6-bb5e-656c5852df00`](/photography/703755de-6f62-4ae6-bb5e-656c5852df00) - Urban(1.00), Architecture(1.00), Macro(1.00)
- [`4d18b3e3-9760-404c-00b4-c5e88610e200`](/photography/4d18b3e3-9760-404c-00b4-c5e88610e200) - Urban(1.00), Architecture(1.00), Vehicles(1.00)
- [`a9e0bf1a-bd08-4a01-a6eb-fa5f4a4d6b00`](/photography/a9e0bf1a-bd08-4a01-a6eb-fa5f4a4d6b00) - Landscape(1.00), Macro(1.00)
- [`2ad4f5b2-6a10-4f9b-6413-80ef66b27900`](/photography/2ad4f5b2-6a10-4f9b-6413-80ef66b27900) - Urban(0.99), Architecture(0.99), Macro(0.99)
- [`40330cc6-9b40-47e8-ae31-27df76f32600`](/photography/40330cc6-9b40-47e8-ae31-27df76f32600) - Urban(1.00), Architecture(1.00), Macro(1.00)
- [`e9885d77-dd2e-46e2-358f-eee10a491500`](/photography/e9885d77-dd2e-46e2-358f-eee10a491500) - Pets(1.00), Macro(1.00)

_...and 373 more_

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
