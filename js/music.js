let backgroundMusicAudio = null;
let currentBackgroundMusicSrc = "";

function musicLabel(path) {
  return stripExtension(basename(path))
    .replace(/^bgm[_-]?/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function stopBackgroundMusic() {
  if (backgroundMusicAudio) {
    backgroundMusicAudio.pause();
    backgroundMusicAudio.removeAttribute("src");
    backgroundMusicAudio.load();
  }

  backgroundMusicAudio = null;
  currentBackgroundMusicSrc = "";
}

async function playBackgroundMusic(src, statusElement = null) {
  stopBackgroundMusic();

  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = BACKGROUND_MUSIC_VOLUME;
  audio.preload = "auto";

  backgroundMusicAudio = audio;
  currentBackgroundMusicSrc = src;

  try {
    await audio.play();

    if (statusElement) {
      statusElement.textContent = `Playing: ${musicLabel(src)}`;
    }

    return true;
  } catch (error) {
    console.warn(`Could not play background music: ${src}`, error);

    stopBackgroundMusic();

    if (statusElement) {
      statusElement.textContent = `Could not play ${musicLabel(src)}. Check the file format.`;
    }

    return false;
  }
}

function renderMusicPanel() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2 class="panel-title">Music</h2>
    <p class="status-note">Choose background music. Battle, evolution, map, and hit sounds will still play normally.</p>
  `;

  const status = document.createElement("p");
  status.className = "status-note";

  const stopButton = document.createElement("button");
  stopButton.className = "panel-button";
  stopButton.type = "button";
  stopButton.textContent = "Stop Music";

  stopButton.addEventListener("click", () => {
    stopBackgroundMusic();
    status.textContent = "Music stopped.";
  });

  wrapper.appendChild(stopButton);

  const musicFiles = state.assets.music || [];

  if (!musicFiles.length) {
    wrapper.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-note">No BGM found. Put files named <strong>bgm_*.wav</strong>, <strong>bgm_*.mp3</strong>, or <strong>bgm_*.ogg</strong> in <strong>sounds/</strong>, then rebuild the manifest.</p>`
    );
    wrapper.appendChild(status);
    panelHost.replaceChildren(wrapper);
    return;
  }

  for (const path of musicFiles) {
    const button = document.createElement("button");
    button.className = "panel-button";
    button.type = "button";
    button.textContent = musicLabel(path);

    if (path === currentBackgroundMusicSrc) {
      button.textContent = `♪ ${button.textContent}`;
    }

    button.addEventListener("click", async () => {
      const played = await playBackgroundMusic(path, status);

      if (played) {
        toggleMenu(false);
      }
    });

    wrapper.appendChild(button);
  }

  wrapper.appendChild(status);
  panelHost.replaceChildren(wrapper);
}