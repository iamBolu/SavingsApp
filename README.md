# Ask Before You Spend

A personal finance assistant that answers one question — **"Can I afford this?"** — *before* you spend, not after.

Most budgeting apps are rearview mirrors: they show you what you already spent. This app flips that. You check before you buy.

## What's here

| File | Purpose |
|------|---------|
| `index.html` | Landing page — hero chat demo, how-it-works, app mockup with bank-adaptive theming, data roadmap |
| `logos.html` | Five logo concepts (light + dark) to choose from |
| `css/styles.css` | Full design system: tokens, type scale, spacing, bank theme palettes |
| `js/main.js` | Chat demo scenarios, bank theme switcher, mobile nav, scroll reveals |
| `SKILL.md` | Design rules the site was built against |

## Design system

- **Logo**: The Question Coin — a coin with a question mark struck where the denomination should be (chosen from the five studies in `logos.html`)
- **Type**: Fraunces (display serif) · Figtree (body) · JetBrains Mono (money & data)
- **Palette**: warm cream `#FAF6EF` + ink `#191713` + a single ember accent `#C75B12`
- **Bank-adaptive theming**: the app mockup re-skins live for RBC, TD, BMO, Scotiabank, Tangerine, Chase, and CIBC using scoped CSS custom properties (`.app-mock[data-bank="..."]`)

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Product roadmap

1. **Manual entry** (prototype) — type in balance, bills, goals
2. **CSV upload** — export from your bank, AI categorizes automatically
3. **Live connection** — Plaid integration, 12,000+ banks and credit unions
