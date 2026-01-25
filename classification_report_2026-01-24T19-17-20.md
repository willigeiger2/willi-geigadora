# Image Classification Analysis Report

**Generated:** 1/24/2026, 11:17:20 AM
**Model:** @cf/llava-hf/llava-1.5-7b-hf

---

## Summary

- **Total Images Classified:** 601
- **High Confidence (≥0.8):** 466 (77.5%)
- **Low Confidence (<0.6):** 71 (11.8%)
- **No Strong Label (<0.5):** 47 (7.8%)
- **Multi-Label Images (≥2 labels >0.6):** 352 (58.6%)

## Category Distribution

Images with confidence above threshold:

| Category | ≥0.5 | ≥0.6 | ≥0.7 | ≥0.8 | ≥0.9 | Avg Score |
|----------|------|------|------|------|------|----------|
| People | 113 | 44 | 33 | 28 | 18 | 0.153 |
| Pets | 72 | 53 | 53 | 53 | 53 | 0.115 |
| Wildlife | 138 | 126 | 126 | 126 | 126 | 0.226 |
| Landscape | 247 | 220 | 214 | 211 | 202 | 0.394 |
| Urban | 158 | 129 | 129 | 129 | 123 | 0.244 |
| Architecture | 260 | 212 | 208 | 207 | 192 | 0.395 |
| Vehicles | 39 | 23 | 23 | 23 | 21 | 0.057 |
| Food | 15 | 3 | 3 | 2 | 2 | 0.021 |
| Night | 26 | 15 | 15 | 15 | 15 | 0.040 |
| Macro | 251 | 203 | 202 | 200 | 197 | 0.398 |
| Interiors | 7 | 0 | 0 | 0 | 0 | 0.021 |
| Featured | 58 | 28 | 27 | 26 | 20 | 0.177 |

## Score Distribution by Category

Visual representation of how many images fall into each confidence range:

### People

Total images: 601

```
0.0-0.2: ████████████████████████████████████████████ 431
0.2-0.4: ███ 29
0.4-0.6: ██████████ 97
0.6-0.8: ██ 16
0.8-1.0: ███ 28
```

### Pets

Total images: 601

```
0.0-0.2: ████████████████████████████████████████████████████ 515
0.2-0.4: █ 9
0.4-0.6: ███ 24
0.6-0.8:  0
0.8-1.0: ██████ 53
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
0.0-0.2: █████████████████████████████████ 330
0.2-0.4: ██ 18
0.4-0.6: ████ 33
0.6-0.8: █ 9
0.8-1.0: ██████████████████████ 211
```

### Urban

Total images: 601

```
0.0-0.2: ███████████████████████████████████████████ 428
0.2-0.4: ██ 11
0.4-0.6: ████ 33
0.6-0.8:  0
0.8-1.0: █████████████ 129
```

### Architecture

Total images: 601

```
0.0-0.2: █████████████████████████████████ 324
0.2-0.4: █ 10
0.4-0.6: ██████ 55
0.6-0.8: █ 5
0.8-1.0: █████████████████████ 207
```

### Vehicles

Total images: 601

```
0.0-0.2: ████████████████████████████████████████████████████████ 556
0.2-0.4: █ 6
0.4-0.6: ██ 16
0.6-0.8:  0
0.8-1.0: ███ 23
```

### Food

Total images: 601

```
0.0-0.2: ██████████████████████████████████████████████████████████ 579
0.2-0.4: █ 7
0.4-0.6: ██ 12
0.6-0.8: █ 1
0.8-1.0: █ 2
```

### Night

Total images: 601

```
0.0-0.2: █████████████████████████████████████████████████████████ 569
0.2-0.4: █ 6
0.4-0.6: ██ 11
0.6-0.8:  0
0.8-1.0: ██ 15
```

### Macro

Total images: 601

```
0.0-0.2: ████████████████████████████████ 313
0.2-0.4: ███ 29
0.4-0.6: ██████ 56
0.6-0.8: █ 3
0.8-1.0: ████████████████████ 200
```

### Interiors

Total images: 241

```
0.0-0.2: ████████████████████████ 231
0.2-0.4: █ 2
0.4-0.6: █ 8
0.6-0.8:  0
0.8-1.0:  0
```

### Featured

Total images: 241

```
0.0-0.2: ██████████████████ 179
0.2-0.4: █ 3
0.4-0.6: ████ 31
0.6-0.8: █ 2
0.8-1.0: ███ 26
```

## Problematic Cases

### Low Confidence Images (< 0.6)

These images may need manual review or indicate categories the model struggles with:

- [`fab399be-525f-4839-249e-57f63507a700`](/photography/fab399be-525f-4839-249e-57f63507a700) - Urban (0.500)
- [`bc4de069-1bb0-414f-02e9-c919cb3d1c00`](/photography/bc4de069-1bb0-414f-02e9-c919cb3d1c00) - People (0.500)
- [`0394bf2c-33d1-46f7-d16b-ae2e0bb0be00`](/photography/0394bf2c-33d1-46f7-d16b-ae2e0bb0be00) - People (0.500)
- [`2899e5bc-001d-46f6-03a5-1abc915d0a00`](/photography/2899e5bc-001d-46f6-03a5-1abc915d0a00) - People (0.500)
- [`6c07a63f-bd54-4aae-ae89-5ca3eb247600`](/photography/6c07a63f-bd54-4aae-ae89-5ca3eb247600) - Landscape (0.500)
- [`f44715d4-e151-47ad-4341-8dd6948c3b00`](/photography/f44715d4-e151-47ad-4341-8dd6948c3b00) - People (0.500)
- [`ba6451d4-61ee-4358-5d8c-0c5cf2212c00`](/photography/ba6451d4-61ee-4358-5d8c-0c5cf2212c00) - Urban (0.500)
- [`bc5e9193-242a-4988-1a48-4e721019eb00`](/photography/bc5e9193-242a-4988-1a48-4e721019eb00) - People (0.500)
- [`2b796baa-3455-43f4-35c9-13240ce0ad00`](/photography/2b796baa-3455-43f4-35c9-13240ce0ad00) - People (0.500)
- [`2bc18d6a-a740-413a-312f-612468257200`](/photography/2bc18d6a-a740-413a-312f-612468257200) - People (0.500)

_...and 61 more_

### No Strong Label (< 0.5 in all categories)

These images don't fit well into any category:

- [`bd76c2c2-72bb-41b4-fdf9-20fe151b6000`](/photography/bd76c2c2-72bb-41b4-fdf9-20fe151b6000) - best: null (0.000)
- [`3b05e848-cf81-40f4-c6a1-b97a3eba5900`](/photography/3b05e848-cf81-40f4-c6a1-b97a3eba5900) - best: People (0.100)
- [`cbb4aa01-0418-4dca-02c8-026232feae00`](/photography/cbb4aa01-0418-4dca-02c8-026232feae00) - best: People (0.400)
- [`d2b32118-4e1c-4824-40f6-421cd2bd4d00`](/photography/d2b32118-4e1c-4824-40f6-421cd2bd4d00) - best: null (0.000)
- [`271c9f7b-4e80-4330-3efb-1195c965f300`](/photography/271c9f7b-4e80-4330-3efb-1195c965f300) - best: null (0.000)
- [`288578a8-26a3-4e1a-6a76-22d77e391700`](/photography/288578a8-26a3-4e1a-6a76-22d77e391700) - best: People (0.100)
- [`1ad98c31-0867-4822-edc9-dec83c35bd00`](/photography/1ad98c31-0867-4822-edc9-dec83c35bd00) - best: People (0.450)
- [`1df9a5aa-3850-4d6b-3006-dde6cd3e1000`](/photography/1df9a5aa-3850-4d6b-3006-dde6cd3e1000) - best: People (0.100)
- [`73adc924-114d-47ce-efca-4a89c7426400`](/photography/73adc924-114d-47ce-efca-4a89c7426400) - best: People (0.450)
- [`26e563b7-fe00-4b0e-3eba-f6d432f75100`](/photography/26e563b7-fe00-4b0e-3eba-f6d432f75100) - best: null (0.000)

_...and 37 more_

### Multi-Label Images

These images have multiple strong classifications (may indicate overlapping concepts):

- [`b4bd2625-6445-4513-4e08-dbd13aed0800`](/photography/b4bd2625-6445-4513-4e08-dbd13aed0800) - Landscape(1.00), Architecture(1.00)
- [`09bc80fb-6931-4806-5927-33c2a7400400`](/photography/09bc80fb-6931-4806-5927-33c2a7400400) - Pets(1.00), Urban(1.00), Architecture(1.00), Vehicles(1.00)
- [`d34e3e00-0427-4c87-5889-956df539fa00`](/photography/d34e3e00-0427-4c87-5889-956df539fa00) - Landscape(1.00), Architecture(1.00)
- [`4d0206d9-6cf1-43c3-8ed7-09bd037f9f00`](/photography/4d0206d9-6cf1-43c3-8ed7-09bd037f9f00) - Landscape(1.00), Architecture(1.00)
- [`e916af6d-76c3-4c00-c672-9f79bed4c400`](/photography/e916af6d-76c3-4c00-c672-9f79bed4c400) - Urban(0.95), Architecture(0.95), Featured(0.95)
- [`4d18b3e3-9760-404c-00b4-c5e88610e200`](/photography/4d18b3e3-9760-404c-00b4-c5e88610e200) - Landscape(1.00), Urban(1.00), Architecture(1.00)
- [`2ad4f5b2-6a10-4f9b-6413-80ef66b27900`](/photography/2ad4f5b2-6a10-4f9b-6413-80ef66b27900) - Urban(1.00), Architecture(1.00)
- [`40330cc6-9b40-47e8-ae31-27df76f32600`](/photography/40330cc6-9b40-47e8-ae31-27df76f32600) - Urban(1.00), Architecture(1.00)
- [`e9885d77-dd2e-46e2-358f-eee10a491500`](/photography/e9885d77-dd2e-46e2-358f-eee10a491500) - Pets(1.00), Architecture(1.00), Macro(1.00), Featured(1.00)
- [`c9d9ab52-7bcf-4a76-7a80-2daf7f08a400`](/photography/c9d9ab52-7bcf-4a76-7a80-2daf7f08a400) - Wildlife(1.00), Landscape(1.00)

_...and 342 more_

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
