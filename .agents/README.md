# Agent Resources

This directory is the agent-facing resource hub for this repo.

- `references.md` lists the preferred repo docs and canonical external docs by domain
- `docs/prds/` remains the product source of truth for what to build

When multiple sources exist, use this order:

1. `docs/prds/` for product intent
2. Official docs and `llms.txt` files for library behavior
3. Local repo workflow docs like `README.md`, `mise.toml`, and `compose.yaml`

Use local workflow docs as implementation guidance, not as a replacement for canonical product or library docs.
