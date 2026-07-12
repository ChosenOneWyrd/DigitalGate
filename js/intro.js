let digitalGateBeepTimer = null;
let digitalGateBeepAudio = null;

function stopDigitalGateBeep() {
  if (digitalGateBeepTimer) {
    window.clearTimeout(digitalGateBeepTimer);
    digitalGateBeepTimer = null;
  }

  if (digitalGateBeepAudio) {
    digitalGateBeepAudio.pause();
    digitalGateBeepAudio = null;
  }
}

function scheduleDigitalGateBeep() {
  stopDigitalGateBeep();

  digitalGateBeepTimer = window.setTimeout(() => {
    digitalGateBeepTimer = null;

    if (gateVideo.paused || intro.classList.contains("hidden")) {
      return;
    }

    digitalGateBeepAudio = playOneShot(DIGITAL_GATE_BEEP_SOUND);
  }, DIGITAL_GATE_BEEP_DELAY);
}

function showStartButton() {
  // startButton.classList.remove("hidden");
}

async function tryAutoplayIntro() {
  gateVideo.src = INTRO_VIDEO;
  gateVideo.muted = true;

  try {
    await gateVideo.play();
    scheduleDigitalGateBeep();
  } catch (error) {
    showStartButton();
  }
}

startButton.addEventListener("click", async (event) => {
  event.stopPropagation();
  startButton.classList.add("hidden");

  try {
    gateVideo.currentTime = 0;
    gateVideo.muted = false;
    await gateVideo.play();
  } catch (error) {
    gateVideo.muted = true;
    await gateVideo.play();
  }

  scheduleDigitalGateBeep();
});

gateVideo.addEventListener("ended", () => {
  stopDigitalGateBeep();
  state.introWaitingForContinue = true;
  gateVideo.pause();

  // Make the first tap/click after the video go directly to the intro container,
  // instead of the video element eating the first interaction on some browsers.
  gateVideo.style.pointerEvents = "none";

  // Optional if you ever want the button visible again.
  // enterGateButton.classList.remove("hidden");
});

function requestGateTransition(event) {
  if (!state.introWaitingForContinue || state.introTransitionStarted) return;

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  beginGateStillTransition();
}

intro.addEventListener("pointerdown", requestGateTransition, { capture: true });
intro.addEventListener("click", requestGateTransition, { capture: true });
enterGateButton.addEventListener("pointerdown", requestGateTransition);
enterGateButton.addEventListener("click", requestGateTransition);

window.addEventListener("keydown", (event) => {
  if (!state.introWaitingForContinue || state.introTransitionStarted) return;

  const ignoredKeys = ["Tab", "Shift", "Control", "Alt", "Meta"];
  if (ignoredKeys.includes(event.key)) return;

  requestGateTransition(event);
});

async function beginGateStillTransition() {
  stopDigitalGateBeep();
  state.introWaitingForContinue = false;
  state.introTransitionStarted = true;

  enterGateButton.classList.add("hidden");

  gateStill.src = INTRO_STILL;
  gateStill.classList.remove("hidden");

  // Let the browser paint the still image immediately.
  await nextFrame();
  await nextFrame();

  // Keep the still visible briefly before it fades into white.
  await sleep(350);

  whiteFlash.classList.add("gate-slow");
  await nextFrame();

  playOneShot(GATE_OPEN_SOUND);
  whiteFlash.classList.add("on");

  await sleep(1450);

  world.classList.remove("hidden");
  mapImage.src = state.currentMap;
  intro.classList.add("hidden");

  await sleep(350);

  whiteFlash.classList.remove("on");

  await sleep(1450);

  whiteFlash.classList.remove("gate-slow");
}