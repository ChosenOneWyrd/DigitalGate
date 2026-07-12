function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function preloadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function basename(path) {
  return path.split("/").pop() || path;
}

function stripExtension(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function mapLabel(path, prefix) {
  const stem = stripExtension(basename(path));
  return stem.startsWith(prefix) ? stem.slice(prefix.length) : stem;
}

function assetLabel(path) {
  return stripExtension(basename(path)).replace(/_/g, " ");
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assetMatchesSearch(path, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return true;

  const filename = stripExtension(basename(path));
  const label = assetLabel(path);
  const searchableText = normalizeSearchText(`${filename} ${label} ${path}`);

  return normalizedQuery
    .split(" ")
    .filter(Boolean)
    .every((word) => searchableText.includes(word));
}

function downloadTextFile(filename, text, mimeType = "application/json") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}