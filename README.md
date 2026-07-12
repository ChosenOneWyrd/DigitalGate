# Digital Gate Website

This is a small static Digital Gate frontend.

## For local runs:
- python prepare_attack_sprites.py
- python build_site_manifest.py
- python -m http.server 8000

## For testing deployments:
- python prepare_attack_sprites.py
- python build_site_manifest.py
- python make_dist.py
- python -m http.server 8000 --directory dist

#### Cmd used to create project for first time
- npx wrangler pages project create digital-gate

## For future deployments:
- python prepare_attack_sprites.py
- python build_site_manifest.py
- python make_dist.py
- npx wrangler pages deploy dist --project-name digital-gate