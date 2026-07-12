async function playIntroVideoFromStart() {
  gateVideo.pause();
  gateVideo.src = INTRO_VIDEO;
  gateVideo.muted = false;

  try {
    gateVideo.currentTime = 0;
  } catch (error) {
    console.warn("Could not reset intro video time.", error);
  }

  try {
    await gateVideo.play();
  } catch (error) {
    try {
      gateVideo.muted = true;
      gateVideo.currentTime = 0;
      await gateVideo.play();
    } catch (mutedError) {
      console.warn("Could not replay intro video automatically.", mutedError);

      // Fallback: show the existing start button if the browser blocks playback.
      startButton.classList.remove("hidden");
    }
  }
}

async function returnToHumanWorld(statusElement = null) {
  if (state.humanWorldReturning) return;

  if (state.battleRunning || state.evolutionRunning) {
    if (statusElement) {
      statusElement.textContent = "Please wait until the current battle/evolution finishes.";
    }
    return;
  }

  state.humanWorldReturning = true;

  try {
    toggleMenu(false);

    // Hide analyzer if it is open.
    analyzerVideo.pause();
    analyzerVideo.classList.add("hidden");
    analyzerViewer.classList.add("hidden");
    analyzerImage.classList.add("hidden");
    backToMap.classList.add("hidden");
    analyzerImage.removeAttribute("src");

    // Reset only the intro flow flags.
    // This does NOT clear map, Digivice, Digimon, Tamers, Enemies, or positions.
    state.introWaitingForContinue = false;
    state.introTransitionStarted = false;

    startButton.classList.add("hidden");
    enterGateButton.classList.add("hidden");
    gateStill.classList.add("hidden");
    gateVideo.style.pointerEvents = "auto";

    whiteFlash.classList.remove("gate-slow");
    whiteFlash.classList.add("on");

    await sleep(450);

    // Show human-world intro, hide digital world, but preserve all world DOM/state.
    intro.classList.remove("hidden");
    world.classList.add("hidden");

    await nextFrame();

    await playIntroVideoFromStart();

    await sleep(180);

    whiteFlash.classList.remove("on");

    if (statusElement) {
      statusElement.textContent = "Returned to the Human World. Your Digital World state is still preserved.";
    }
  } finally {
    await sleep(450);
    state.humanWorldReturning = false;
  }
}