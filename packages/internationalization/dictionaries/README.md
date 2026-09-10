# Dictionaries

`en.json` (international/fallback) and `pt.json` (Brazil — EXECUTAR's real
market per `PRICING-001`, `market: Brazil`) carry real, natively-authored
EXECUTAR copy (M14).

`es.json`, `de.json`, `fr.json`, `zh.json` are **not yet translated**: they
currently mirror `en.json` verbatim so every locale stays structurally safe
(no missing keys, no runtime crash from `dictionary.web.home.principles`
etc. being `undefined`) — real English content, not the stock Next Forge
placeholder copy these files used to carry, but not yet localized either.

To translate them for real: run `bun run translate` (this package's own
script, wrapping `languine`), which needs a real Languine API key — not
available in the sandbox this milestone was built in. Until then, an es/
de/fr/zh visitor sees the English copy rather than a broken or stale page.
