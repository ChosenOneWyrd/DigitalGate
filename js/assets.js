function normalizeManifest(manifest) {
  return {
    maps: Array.isArray(manifest?.maps) ? manifest.maps : [DEFAULT_MAP],
    digivices: Array.isArray(manifest?.digivices) ? manifest.digivices : [],
    tamers: Array.isArray(manifest?.tamers) ? manifest.tamers : [],
    digimon: Array.isArray(manifest?.digimon) ? manifest.digimon : [],
    enemies: Array.isArray(manifest?.enemies) ? manifest.enemies : [],
    sprites: Array.isArray(manifest?.sprites) ? manifest.sprites : [],
  };
}

async function loadAssets() {
  try {
    const response = await fetch(ASSET_MANIFEST, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.assets = normalizeManifest(await response.json());
  } catch (error) {
    console.warn("Could not load assets_manifest.json. Using default map only.", error);
    state.assets = normalizeManifest({ maps: [DEFAULT_MAP] });
  }

  if (!state.assets.maps.includes(DEFAULT_MAP)) {
    state.assets.maps.unshift(DEFAULT_MAP);
  }
}