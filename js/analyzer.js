function renderAnalyzerPanel() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2 class="panel-title">Digimon Analyzer</h2>
    <form id="analyzerForm" class="search-row">
      <input id="analyzerSearch" class="search-input" type="search" placeholder="Search Digimon..." autocomplete="off" required>
      <button class="search-button" type="submit">Search</button>
    </form>
    <p id="analyzerStatus" class="status-note"></p>
  `;

  panelHost.replaceChildren(wrapper);

  const form = document.getElementById("analyzerForm");
  const input = document.getElementById("analyzerSearch");
  const status = document.getElementById("analyzerStatus");

  input.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) return;

    await searchAnalyzer(name, status);
  });
}

async function fetchAnalyzerEndpoint(endpoint, name) {
  const url = `${ANALYZER_API_BASE}${endpoint}?name=${encodeURIComponent(name)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `Analyzer request failed: HTTP ${response.status}`);
  }

  return data;
}

function resolveAnalyzerImageUrl(imageUrl) {
  return new URL(imageUrl, ANALYZER_API_BASE).href;
}

async function searchAnalyzer(name, statusElement) {
  try {
    statusElement.textContent = "Searching analyzer cache...";
    let data = await fetchAnalyzerEndpoint("/api/search", name);

    if (data.status === "missing") {
      statusElement.textContent = "Not cached yet. Generating analyzer image...";
      data = await fetchAnalyzerEndpoint("/api/generate", name);
    }

    if (data.status !== "ready" || !data.imageUrl) {
      throw new Error(data.message || "No analyzer image was returned.");
    }

    statusElement.textContent = "Opening analyzer...";
    await showAnalyzerSequence(resolveAnalyzerImageUrl(data.imageUrl));
  } catch (error) {
    statusElement.textContent = error.message || "Analyzer search failed.";
  }
}

async function showAnalyzerSequence(imageUrl) {
  toggleMenu(false);

  analyzerImage.src = imageUrl;
  analyzerImage.classList.add("hidden");
  backToMap.classList.add("hidden");

  analyzerVideo.src = ANALYZER_VIDEO;
  analyzerVideo.currentTime = 0;
  analyzerVideo.muted = false;
  analyzerVideo.classList.remove("hidden");

  analyzerViewer.classList.remove("hidden");

  await playAnalyzerVideoOrSkip();
  showAnalyzerImageNow();
}

function playAnalyzerVideoOrSkip() {
  return new Promise((resolve) => {
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      analyzerVideo.removeEventListener("ended", finish);
      analyzerVideo.removeEventListener("error", finish);
      resolve();
    }

    analyzerVideo.addEventListener("ended", finish);
    analyzerVideo.addEventListener("error", finish);

    const playPromise = analyzerVideo.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(async () => {
        try {
          analyzerVideo.muted = true;
          analyzerVideo.currentTime = 0;
          await analyzerVideo.play();
        } catch (error) {
          finish();
        }
      });
    }
  });
}

function showAnalyzerImageNow() {
  analyzerVideo.pause();
  analyzerVideo.classList.add("hidden");
  analyzerImage.classList.remove("hidden");
  backToMap.classList.remove("hidden");
}

backToMap.addEventListener("click", () => {
  analyzerVideo.pause();
  analyzerVideo.classList.add("hidden");
  analyzerViewer.classList.add("hidden");
  analyzerImage.classList.add("hidden");
  backToMap.classList.add("hidden");
  analyzerImage.removeAttribute("src");
  mapImage.src = state.currentMap;
});