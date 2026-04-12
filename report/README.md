# VegPrice AI — Technical Report

This folder contains the complete technical documentation for the **Chennai Vegetable Price Prediction System (VegPrice AI)**.

## Contents

| File | Description |
|------|-------------|
| `main.tex` | Full LaTeX report — compile with pdflatex |
| `architecture.tex` | Standalone TikZ architecture diagram |
| `api_reference.md` | Complete API endpoint reference |
| `setup_guide.md` | Step-by-step installation guide |
| `README.md` | This file |

---

## How to Compile the LaTeX Report

### Requirements
- TeX distribution: [TeX Live](https://tug.org/texlive/) (Linux/macOS) or [MiKTeX](https://miktex.org/) (Windows)
- Required packages: `tikz`, `pgfplots`, `booktabs`, `tabularx`, `longtable`, `listings`, `fancyhdr`, `titlesec`, `hyperref`, `tcolorbox`, `fontawesome5`, `mdframed`, `lmodern`

### Install on macOS
```bash
brew install --cask mactex
# or for minimal install:
brew install basictex
sudo tlmgr install fontawesome5 tcolorbox mdframed pgfplots booktabs
```

### Compile
```bash
cd report
pdflatex main.tex
pdflatex main.tex   # second pass for TOC and cross-references
pdflatex main.tex   # third pass for final references
```

The output `main.pdf` will be generated in the `report/` folder.

### Compile Architecture Diagram Standalone
```bash
pdflatex architecture.tex
```

---

## Quick Links

- **API:** https://chennai-vegetable-price-prediction.vercel.app
- **Repo:** https://github.com/nitheeshdr/Chennai-Vegetable-Price-Prediction-System
- **EAS Builds:** https://expo.dev/accounts/nitheeshdr/projects/vegprice
