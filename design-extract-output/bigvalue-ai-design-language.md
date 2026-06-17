# Design Language: 데이터로 판단의 기준을 만듭니다 - Homepage | BigValue

> Extracted from `https://www.bigvalue.ai/` on June 17, 2026
> 1325 elements analyzed

This document describes the complete design language of the website. It is structured for AI/LLM consumption — use it to faithfully recreate the visual design in any framework.

## Color Palette

### Primary Colors

| Role | Hex | RGB | HSL | Usage Count |
|------|-----|-----|-----|-------------|
| Primary | `#f5effe` | rgb(245, 239, 254) | hsl(264, 88%, 97%) | 31 |
| Secondary | `#4434e2` | rgb(68, 52, 226) | hsl(246, 75%, 55%) | 57 |
| Accent | `#dcdbfd` | rgb(220, 219, 253) | hsl(242, 89%, 93%) | 3 |

### Neutral Colors

| Hex | HSL | Usage Count |
|-----|-----|-------------|
| `#e7e5e4` | hsl(20, 6%, 90%) | 1301 |
| `#0c0a09` | hsl(20, 14%, 4%) | 699 |
| `#ffffff` | hsl(0, 0%, 100%) | 196 |
| `#000000` | hsl(0, 0%, 0%) | 134 |
| `#25252f` | hsl(240, 12%, 16%) | 123 |
| `#3f3f49` | hsl(240, 7%, 27%) | 88 |
| `#646371` | hsl(244, 7%, 42%) | 55 |
| `#9291a5` | hsl(243, 10%, 61%) | 16 |
| `#64748b` | hsl(215, 16%, 47%) | 12 |
| `#d4d3dd` | hsl(246, 13%, 85%) | 12 |
| `#334155` | hsl(215, 25%, 27%) | 9 |
| `#a8a7bb` | hsl(243, 13%, 69%) | 9 |

### Background Colors

Used on large-area elements: `#ffffff`, `#f5f4ff`, `#f1f5f9`, `#ecebfc`, `#25252f`

### Text Colors

Text color palette: `#000000`, `#0c0a09`, `#25252f`, `#64748b`, `#646371`, `#ffffff`, `#4434e2`, `#334155`, `#e8492a`, `#0c0b17`

### Gradients

```css
background-image: linear-gradient(to right, rgb(232, 73, 42), rgb(247, 107, 74));
```

```css
background-image: linear-gradient(135deg, rgb(255, 250, 245) 0%, rgb(255, 238, 223) 50%, rgb(255, 224, 202) 100%);
```

```css
background-image: linear-gradient(135deg, rgb(255, 237, 222) 0%, rgb(255, 217, 196) 60%, rgb(255, 202, 168) 100%);
```

```css
background-image: radial-gradient(circle, rgba(247, 107, 74, 0.35) 0%, rgba(247, 107, 74, 0) 60%);
```

```css
background-image: linear-gradient(to right bottom, rgb(232, 73, 42), rgb(247, 107, 74), rgb(255, 143, 94));
```

```css
background-image: linear-gradient(to right, rgb(232, 73, 42), rgb(247, 107, 74), rgb(255, 143, 94));
```

```css
background-image: linear-gradient(to right, rgb(158, 93, 249), rgb(134, 79, 212));
```

```css
background-image: linear-gradient(276deg, rgba(60, 238, 181, 0.25) -9.75%, rgba(177, 121, 255, 0.25) 49.67%, rgba(68, 52, 226, 0.25) 109.08%);
```

### Full Color Inventory

| Hex | Contexts | Count |
|-----|----------|-------|
| `#e7e5e4` | border | 1301 |
| `#0c0a09` | text, border | 699 |
| `#ffffff` | background, text | 196 |
| `#000000` | text, background | 134 |
| `#25252f` | text, background | 123 |
| `#3f3f49` | text | 88 |
| `#6867fe` | text | 84 |
| `#4434e2` | background, text | 57 |
| `#646371` | text, background | 55 |
| `#f5effe` | border, background | 31 |
| `#9291a5` | text | 16 |
| `#c299fb` | border, text | 16 |
| `#864fd4` | background | 14 |
| `#9e5df9` | border | 14 |
| `#64748b` | text | 12 |
| `#d4d3dd` | text | 12 |
| `#334155` | text | 9 |
| `#a8a7bb` | text, background | 9 |
| `#e8492a` | background, border, text | 4 |
| `#8d8dfb` | text, border | 4 |
| `#006746` | text | 3 |
| `#d2fbee` | background | 3 |
| `#00e49b` | background | 3 |
| `#dcdbfd` | background, border | 3 |
| `#3526c7` | text | 1 |
| `#1a1a1a` | text | 1 |
| `#565455` | text | 1 |

## Typography

### Font Families

- **Pretendard Variable** — used for all (1325 elements)

### Type Scale

| Size (px) | Size (rem) | Weight | Line Height | Letter Spacing | Used On |
|-----------|------------|--------|-------------|----------------|---------|
| 80px | 5rem | 500 | 120px | -2.5px | p, span, br |
| 42px | 2.625rem | 700 | 63px | -2.1px | p |
| 40px | 2.5rem | 700 | 60px | normal | p |
| 32px | 2rem | 700 | 48px | normal | h1, p |
| 28px | 1.75rem | 400 | 42px | -1px | p, span, h3, br |
| 20px | 1.25rem | 700 | 30px | normal | p, button |
| 16px | 1rem | 500 | 24px | normal | div, span, svg, path |
| 14px | 0.875rem | 400 | 21px | normal | a, span, button, p |
| 12px | 0.75rem | 400 | 18px | normal | a, span, svg, path |
| 10px | 0.625rem | 400 | 15px | normal | html, head, meta, link |

### Heading Scale

```css
h1 { font-size: 32px; font-weight: 700; line-height: 48px; }
h3 { font-size: 28px; font-weight: 400; line-height: 42px; }
h4 { font-size: 16px; font-weight: 500; line-height: 24px; }
```

### Body Text

```css
body { font-size: 14px; font-weight: 400; line-height: 21px; }
```

### Font Weights in Use

`400` (1149x), `600` (105x), `500` (47x), `700` (20x), `800` (4x)

## Spacing

**Base unit:** 4px

| Token | Value | Rem |
|-------|-------|-----|
| spacing-1 | 1px | 0.0625rem |
| spacing-48 | 48px | 3rem |
| spacing-56 | 56px | 3.5rem |
| spacing-73 | 73px | 4.5625rem |
| spacing-80 | 80px | 5rem |
| spacing-100 | 100px | 6.25rem |
| spacing-120 | 120px | 7.5rem |
| spacing-148 | 148px | 9.25rem |
| spacing-200 | 200px | 12.5rem |
| spacing-223 | 223px | 13.9375rem |
| spacing-240 | 240px | 15rem |

## Border Radii

| Label | Value | Count |
|-------|-------|-------|
| sm | 4px | 4 |
| md | 8px | 128 |
| lg | 12px | 6 |
| lg | 16px | 89 |
| xl | 20px | 1 |
| xl | 24px | 1 |
| full | 28px | 1 |
| full | 9999px | 24 |

## Box Shadows

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(232, 73, 42, 0.4) 0px 2px 8px 0px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(232, 73, 42, 0.55) 0px 8px 24px -8px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(232, 216, 254) 0px 0px 4px 0px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 0px 10px 0px;
```

## CSS Custom Properties

### Colors

```css
--foreground: 20 14.3% 4.1%;
--card: 0 0% 100%;
--card-foreground: 20 14.3% 4.1%;
--popover: 0 0% 100%;
--popover-foreground: 20 14.3% 4.1%;
--primary: 24 9.8% 10%;
--primary-foreground: 60 9.1% 97.8%;
--secondary: 60 4.8% 95.9%;
--secondary-foreground: 24 9.8% 10%;
--muted: 60 4.8% 95.9%;
--muted-foreground: 25 5.3% 44.7%;
--accent: 60 4.8% 95.9%;
--accent-foreground: 24 9.8% 10%;
--destructive: 0 84.2% 60.2%;
--destructive-foreground: 60 9.1% 97.8%;
--border: 20 5.9% 90%;
--ring: 20 14.3% 4.1%;
--ds-bg: #f4f6fb;
--ds-bg-alt: #eef1f8;
--ds-card: #fff;
--ds-muted: #6b7382;
--ds-muted-2: #94a3b8;
--ds-chart-1: #4434e2;
--ds-chart-2: #06b6d4;
--ds-chart-3: #14b8a6;
--ds-chart-4: #f59e0b;
--ds-chart-5: #f43f5e;
--ds-chart-6: #a855f7;
--ds-chart-7: #ec4899;
--ds-radius-card: 14px;
--ds-shadow-card: 0 1px 2px #0f172a08;
--ds-shadow-card-hover: 0 4px 12px #0f172a0f;
--ds-shadow-popover: 0 20px 50px #0b12202e;
--tw-ring-shadow: 0 0 #0000;
--tw-border-spacing-x: 0;
--tw-ring-color: #3b82f680;
--tw-ring-offset-color: #fff;
--tw-ring-offset-width: 0px;
--tw-shadow-colored: 0 0 #0000;
--tw-ring-offset-shadow: 0 0 #0000;
--tw-ring-inset: ;
--tw-border-spacing-y: 0;
```

### Spacing

```css
--ds-gap-bento: 14px;
--ds-gap-section: 24px;
--tw-numeric-spacing: ;
--tw-contain-size: ;
```

### Shadows

```css
--ds-shadow-hero: 0 10px 24px #4434e240;
--tw-drop-shadow: ;
--tw-shadow: 0 0 #0000;
```

### Radii

```css
--radius: .5rem;
--ds-radius-button: 10px;
--ds-radius-chip-sm: 6px;
--ds-radius-pill: 999px;
```

### Other

```css
--background: 0 0% 100%;
--input: 20 5.9% 90%;
--ds-sidebar: #0a0d18;
--ds-sidebar-2: #141826;
--ds-ink: #0b1220;
--ds-ink-2: #1e293b;
--ds-line: #e5e9f0;
--ds-line-2: #eef1f7;
--ds-brand: #4434e2;
--ds-brand-darkest: #11086c;
--ds-brand-darker: #3025a0;
--ds-brand-dark: #3526c7;
--ds-brand-light: #6867fe;
--ds-brand-lighter: #8d8dfb;
--ds-brand-lightest: #dcdbfd;
--ds-brand-pale: #ecebfc;
--ds-emerald: #10b981;
--ds-rose: #f43f5e;
--ds-amber: #f59e0b;
--ds-slate: #64748b;
--ds-heat-0: #f1f5f9;
--ds-heat-1: #ecebfc;
--ds-heat-2: #dcdbfd;
--ds-heat-3: #8d8dfb;
--ds-heat-4: #6867fe;
--ds-heat-5: #4434e2;
--ds-heat-6: #3025a0;
--ds-heat-7: #11086c;
--ds-fs-display: 32px;
--ds-fs-h1: 32px;
--ds-fs-h2: 24px;
--ds-fs-h3: 20px;
--ds-fs-kpi: 24px;
--ds-fs-body-lg: 15px;
--ds-fs-body: 14px;
--ds-fs-tooltip: 13px;
--ds-fs-caption: 12px;
--ds-fs-chip: 12px;
--ds-lh-display: 1.2;
--ds-lh-h1: 1.3;
--ds-lh-h2: 1.4;
--ds-lh-h3: 1.5;
--ds-lh-kpi: 1.2;
--ds-lh-body: 1.6;
--ds-lh-caption: 1.5;
--ds-lh-chip: 1.3;
--ds-fw-regular: 400;
--ds-fw-medium: 500;
--ds-fw-semi: 600;
--ds-fw-bold: 700;
--ds-ls-display: -.02em;
--ds-ls-h1: -.015em;
--ds-ls-h2: -.01em;
--ds-ls-kpi: -.01em;
--ds-ls-eyebrow: .08em;
--vh: 100%;
--tw-backdrop-sepia: ;
--tw-sepia: ;
--tw-ordinal: ;
--tw-contain-style: ;
--tw-backdrop-invert: ;
--tw-backdrop-grayscale: ;
--tw-hue-rotate: ;
--tw-pan-y: ;
--tw-rotate: 0;
--tw-gradient-via-position: ;
--tw-saturate: ;
--tw-scroll-snap-strictness: proximity;
--tw-grayscale: ;
--tw-backdrop-hue-rotate: ;
--tw-gradient-to-position: ;
--tw-numeric-fraction: ;
--tw-skew-y: 0;
--tw-slashed-zero: ;
--tw-backdrop-opacity: ;
--tw-gradient-from-position: ;
--tw-pinch-zoom: ;
--tw-contain-paint: ;
--tw-backdrop-saturate: ;
--tw-brightness: ;
--tw-scale-y: 1;
--tw-backdrop-contrast: ;
--tw-backdrop-brightness: ;
--tw-pan-x: ;
--tw-translate-y: 0;
--tw-contrast: ;
--tw-skew-x: 0;
--tw-backdrop-blur: ;
--tw-translate-x: 0;
--tw-scale-x: 1;
--tw-blur: ;
--tw-invert: ;
--tw-numeric-figure: ;
--tw-contain-layout: ;
```

### Semantic

```css
success: [object Object];
warning: [object Object];
error: [object Object];
info: [object Object];
```

## Breakpoints

| Name | Value | Type |
|------|-------|------|
| sm | 600px | min-width |
| 1200px | 1200px | min-width |
| 1400px | 1400px | min-width |

## Transitions & Animations

**Easing functions:** `[object Object]`, `[object Object]`

**Durations:** `0.5s`, `0.3s`, `0.15s`, `0.2s`

### Common Transitions

```css
transition: all;
transition: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), fill 0.15s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1);
transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
transition: box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1);
transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), fill 0.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.2s cubic-bezier(0.4, 0, 0.2, 1);
transition: 0.2s cubic-bezier(0, 0, 0.2, 1);
```

### Keyframe Animations

**spin**
```css
@keyframes spin {
  100% { transform: rotate(360deg); }
}
```

**bounce**
```css
@keyframes bounce {
  0%, 100% { animation-timing-function: cubic-bezier(0.8, 0, 1, 1); transform: translateY(-25%); }
  50% { animation-timing-function: cubic-bezier(0, 0, 0.2, 1); transform: none; }
}
```

**marquee**
```css
@keyframes marquee {
  0% { transform: translate(0px); }
  100% { transform: translate(-100%); }
}
```

**ping**
```css
@keyframes ping {
  75%, 100% { opacity: 0; transform: scale(2); }
}
```

**pulse**
```css
@keyframes pulse {
  50% { opacity: 0.5; }
}
```

**scroll**
```css
@keyframes scroll {
  0% { transform: translate(0px); }
  100% { transform: translate(-100%); }
}
```

**scrollReverse**
```css
@keyframes scrollReverse {
  0% { transform: translate(-100%); }
  100% { transform: translate(0px); }
}
```

**enter**
```css
@keyframes enter {
  0% { opacity: var(--tw-enter-opacity,1); transform: translate3d(var(--tw-enter-translate-x,0),var(--tw-enter-translate-y,0),0)scale3d(var(--tw-enter-scale,1),var(--tw-enter-scale,1),var(--tw-enter-scale,1))rotate(var(--tw-enter-rotate,0)); }
}
```

**exit**
```css
@keyframes exit {
  100% { opacity: var(--tw-exit-opacity,1); transform: translate3d(var(--tw-exit-translate-x,0),var(--tw-exit-translate-y,0),0)scale3d(var(--tw-exit-scale,1),var(--tw-exit-scale,1),var(--tw-exit-scale,1))rotate(var(--tw-exit-rotate,0)); }
}
```

**dash-pulse**
```css
@keyframes dash-pulse {
  0% { opacity: 0.5; transform: scale(1); }
  100% { opacity: 0; transform: scale(2.2); }
}
```

## Component Patterns

Detected UI component patterns and their most common styles:

### Buttons (4 instances)

```css
.button {
  background-color: rgb(68, 52, 226);
  color: rgb(255, 255, 255);
  font-size: 20px;
  font-weight: 400;
  padding-top: 5px;
  padding-right: 36px;
  border-radius: 6px;
}
```

### Cards (18 instances)

```css
.card {
  background-color: rgb(245, 239, 254);
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 0px 10px 0px;
  padding-top: 16px;
  padding-right: 16px;
}
```

### Links (50 instances)

```css
.link {
  color: rgb(12, 10, 9);
  font-size: 16px;
  font-weight: 400;
}
```

### Navigation (2 instances)

```css
.navigatio {
  color: rgb(12, 10, 9);
  padding-top: 0px;
  padding-bottom: 0px;
  padding-left: 0px;
  padding-right: 0px;
  position: static;
}
```

### Footer (1 instances)

```css
.foote {
  background-color: rgb(37, 37, 47);
  color: rgb(12, 10, 9);
  padding-top: 80px;
  padding-bottom: 56px;
  font-size: 10px;
}
```

## Component Clusters

Reusable component instances grouped by DOM structure and style similarity:

### Button — 3 instances, 3 variants

**Variant 1** (1 instance)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(100, 99, 113);
  padding: 5px 8px 5px 8px;
  border-radius: 6px;
  border: 0px solid rgb(231, 229, 228);
  font-size: 14px;
  font-weight: 400;
```

**Variant 2** (1 instance)

```css
  background: rgb(0, 0, 0);
  color: rgb(255, 255, 255);
  padding: 5px 36px 5px 36px;
  border-radius: 6px;
  border: 0px solid rgb(231, 229, 228);
  font-size: 20px;
  font-weight: 400;
```

**Variant 3** (1 instance)

```css
  background: rgb(238, 237, 241);
  color: rgb(26, 26, 26);
  padding: 5px 36px 5px 36px;
  border-radius: 6px;
  border: 0px solid rgb(231, 229, 228);
  font-size: 20px;
  font-weight: 400;
```

## Layout System

**0 grid containers** and **207 flex containers** detected.

### Container Widths

| Max Width | Padding |
|-----------|---------|
| 100% | 0px |
| 1400px | 0px |
| 1390px | 0px |

### Flex Patterns

| Direction/Wrap | Count |
|----------------|-------|
| column/nowrap | 119x |
| row/nowrap | 86x |
| row/wrap | 2x |

**Gap values:** `10px`, `12px`, `16px`, `20px`, `24px`, `28px`, `40px`, `4px`, `6px`, `8px`

## Accessibility (WCAG 2.1)

**Overall Score: 73%** — 8 passing, 3 failing color pairs

### Failing Color Pairs

| Foreground | Background | Ratio | Level | Used On |
|------------|------------|-------|-------|---------|
| `#ffffff` | `#00e49b` | 1.67:1 | FAIL | span (3x) |

### Passing Color Pairs

| Foreground | Background | Ratio | Level |
|------------|------------|-------|-------|
| `#006746` | `#d2fbee` | 6.2:1 | AA |
| `#ffffff` | `#4434e2` | 7.41:1 | AAA |
| `#3526c7` | `#dcdbfd` | 6.92:1 | AA |
| `#ffffff` | `#000000` | 21:1 | AAA |
| `#1a1a1a` | `#eeedf1` | 14.93:1 | AAA |

## Design System Score

**Overall: 82/100 (Grade: B)**

| Category | Score |
|----------|-------|
| Color Discipline | 80/100 |
| Typography Consistency | 90/100 |
| Spacing System | 85/100 |
| Shadow Consistency | 100/100 |
| Border Radius Consistency | 80/100 |
| Accessibility | 73/100 |
| CSS Tokenization | 100/100 |

**Strengths:** Consistent typography system, Well-defined spacing scale, Clean elevation system, Good CSS variable tokenization

**Issues:**
- 3 WCAG contrast failures
- 12 !important rules — prefer specificity over overrides
- 93% of CSS is unused — consider purging
- 2216 duplicate CSS declarations

## Gradients

**8 unique gradients** detected.

| Type | Direction | Stops | Classification |
|------|-----------|-------|----------------|
| linear | to right | 2 | brand |
| linear | 135deg | 3 | bold |
| linear | 135deg | 3 | bold |
| radial | circle | 2 | brand |
| linear | to right bottom | 3 | bold |
| linear | to right | 3 | bold |
| linear | to right | 2 | brand |
| linear | 276deg | 3 | bold |

```css
background: linear-gradient(to right, rgb(232, 73, 42), rgb(247, 107, 74));
background: linear-gradient(135deg, rgb(255, 250, 245) 0%, rgb(255, 238, 223) 50%, rgb(255, 224, 202) 100%);
background: linear-gradient(135deg, rgb(255, 237, 222) 0%, rgb(255, 217, 196) 60%, rgb(255, 202, 168) 100%);
background: radial-gradient(circle, rgba(247, 107, 74, 0.35) 0%, rgba(247, 107, 74, 0) 60%);
background: linear-gradient(to right bottom, rgb(232, 73, 42), rgb(247, 107, 74), rgb(255, 143, 94));
```

## Z-Index Map

**3 unique z-index values** across 1 layers.

| Layer | Range | Elements |
|-------|-------|----------|
| sticky | 10,50 | div.a.b.s.o.l.u.t.e. .t.o.p.-.[.0...4.r.e.m.]. .l.e.f.t.-.1./.2. .-.t.r.a.n.s.l.a.t.e.-.x.-.1./.2. .w.-.[.1.r.e.m.]. .h.-.[.1.r.e.m.]. .b.g.-.w.h.i.t.e. .r.o.t.a.t.e.-.4.5. .b.o.r.d.e.r.-.l. .b.o.r.d.e.r.-.t. .b.o.r.d.e.r.-.s.l.a.t.e.-.2.0.0. .z.-.1.0, div.a.b.s.o.l.u.t.e. .t.o.p.-.[.0...4.r.e.m.]. .l.e.f.t.-.1./.2. .-.t.r.a.n.s.l.a.t.e.-.x.-.1./.2. .w.-.[.1.r.e.m.]. .h.-.[.1.r.e.m.]. .b.g.-.w.h.i.t.e. .r.o.t.a.t.e.-.4.5. .b.o.r.d.e.r.-.l. .b.o.r.d.e.r.-.t. .b.o.r.d.e.r.-.s.l.a.t.e.-.2.0.0. .z.-.1.0, img.r.e.l.a.t.i.v.e. .z.-.1.0. .h.-.[.6.0.%.]. .d.e.s.k.t.o.p.:.h.-.[.2.4.r.e.m.]. .w.-.a.u.t.o. .o.b.j.e.c.t.-.c.o.n.t.a.i.n. .t.r.a.n.s.i.t.i.o.n.-.t.r.a.n.s.f.o.r.m. .d.u.r.a.t.i.o.n.-.3.0.0. .g.r.o.u.p.-.h.o.v.e.r.:.s.c.a.l.e.-.[.1...0.2.] |

## SVG Icons

**17 unique SVG icons** detected. Dominant style: **outlined**.

| Size Class | Count |
|------------|-------|
| xs | 2 |
| sm | 10 |
| md | 2 |
| lg | 2 |
| xl | 1 |

**Icon colors:** `#00E49B`, `#4434E2`, `#9E5DF9`, `black`, `currentColor`, `#E8D8FE`, `#AF7AFA`, `#E3E2E9`, `#A8A7BB`

## Image Style Patterns

| Pattern | Count | Key Styles |
|---------|-------|------------|
| thumbnail | 86 | objectFit: fill, borderRadius: 0px, shape: square |
| gallery | 3 | objectFit: fill, borderRadius: 0px, shape: square |
| general | 1 | objectFit: contain, borderRadius: 0px, shape: square |

**Aspect ratios:** 1:1 (85x), 9:16 (1x), 2.59:1 (1x), 2.03:1 (1x), 4.05:1 (1x), 3.27:1 (1x)

## Motion Language

**Feel:** mixed · **Scroll-linked:** yes

### Duration Tokens

| name | value | ms |
|---|---|---|
| `xs` | `150ms` | 150 |
| `sm` | `200ms` | 200 |
| `md` | `300ms` | 300 |
| `lg` | `500ms` | 500 |

### Easing Families

- **custom** (79 uses) — `cubic-bezier(0.4, 0, 0.2, 1)`
- **ease-out** (4 uses) — `cubic-bezier(0, 0, 0.2, 1)`

### Keyframes In Use

| name | kind | properties | uses |
|---|---|---|---|
| `ping` | reveal | opacity, transform | 9 |
| `scroll` | slide | transform | 2 |
| `scrollReverse` | slide | transform | 2 |

## Component Anatomy

### button — 3 instances

**Slots:** label
**Variants:** primary
**Sizes:** medium

| variant | count | sample label |
|---|---|---|
| default | 2 | 문의하기 |
| primary | 1 | 무료로 체험하기 |

## Brand Voice

**Tone:** friendly · **Pronoun:** third-person · **Headings:** all-lowercase (tight)

### Button Copy Patterns

- "문의하기" (2×)
- "무료로 체험하기" (1×)

### Sample Headings

> BigValue는 데이터로 '판단의 기준'을 만드는 회사입니다
> 부동산 중개 에이전트
복덕방 가재 오픈
> 부동산 중개 에이전트
복덕방 가재 오픈

## Page Intent

**Type:** `landing` (confidence 0.31)
**Description:** 빅밸류는 복잡한 분석 과정 없이 빠르고 일관된 판단을 지원합니다. 신뢰 가능한 데이터와 표준화된 판단 구조로 기업의 의사결정을 혁신합니다.

Alternates: blog-post (0.35)

## Section Roles

Reading order (top→bottom): nav → pricing → nav → content → pricing → content → content → content → content → content → footer → content → content → content → content

| # | Role | Heading | Confidence |
|---|------|---------|------------|
| 0 | nav | — | 0.9 |
| 1 | nav | — | 0.9 |
| 2 | pricing | BigValue는 데이터로 '판단의 기준'을 만드는 회사입니다 | 0.4 |
| 3 | content | 부동산 중개 에이전트
복덕방 가재 오픈 | 0.3 |
| 4 | pricing | — | 0.4 |
| 5 | content | — | 0.3 |
| 6 | content | — | 0.3 |
| 7 | content | — | 0.3 |
| 8 | content | — | 0.3 |
| 9 | content | — | 0.3 |
| 10 | footer | — | 0.95 |
| 11 | content | — | 0.3 |
| 12 | content | — | 0.3 |
| 13 | content | — | 0.3 |
| 14 | content | — | 0.3 |

## Material Language

**Label:** `material-you` (confidence 0.45)

| Metric | Value |
|--------|-------|
| Avg saturation | 0.339 |
| Shadow profile | soft |
| Avg shadow blur | 0px |
| Max radius | 9999px |
| backdrop-filter in use | no |
| Gradients | 8 |

## Imagery Style

**Label:** `photography` (confidence 0.013)
**Counts:** total 90, svg 0, icon 2, screenshot-like 0, photo-like 1
**Dominant aspect:** square-ish
**Radius profile on images:** square

## Component Library

**Detected:** `tailwindcss` (confidence 0.809)

Evidence:
- tailwind-like class density 77%

## Quick Start

To recreate this design in a new project:

1. **Install fonts:** Add `Pretendard Variable` from Google Fonts or your font provider
2. **Import CSS variables:** Copy `variables.css` into your project
3. **Tailwind users:** Use the generated `tailwind.config.js` to extend your theme
4. **Design tokens:** Import `design-tokens.json` for tooling integration
