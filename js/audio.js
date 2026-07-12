const activeSounds = new Set();

function playOneShot(src, volume = 1) {
  try {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;

    activeSounds.add(audio);

    audio.addEventListener(
      "ended",
      () => {
        activeSounds.delete(audio);
      },
      { once: true }
    );

    audio.addEventListener(
      "error",
      () => {
        activeSounds.delete(audio);
      },
      { once: true }
    );

    const playPromise = audio.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((error) => {
        console.warn(`Could not play sound: ${src}`, error);
        activeSounds.delete(audio);
      });
    }

    return audio;
  } catch (error) {
    console.warn(`Could not create sound: ${src}`, error);
    return null;
  }
}