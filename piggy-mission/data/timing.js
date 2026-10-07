/*
 * ANIMATION TIMING: all values in milliseconds unless noted.
 * `speed` scales everything at once (1.2 = 20% faster).
 * Each scene reads its own block, so comedic beats can be tuned in one place.
 */
window.PIGGY_TIMING = {
  speed: 1,

  // shared
  captionHold: 1500, // default time a caption/title stays up
  bubbleHold: 1500, // default time a speech bubble stays up
  tapHintDelay: 700, // pause before the "tap to continue" hint fades in
  holdMs: 700, // how long a "hold" must last
  holdForgiveAfter: 2, // failed holds before the film just carries on
  swipeDistance: 40, // px of horizontal drag that counts as a swipe
  promptTimeout: 0, // 0 = wait for the viewer forever; >0 auto-continues after this long
  transition: 650, // scene-to-scene transition

  opening: {
    sleepBeforeRoll: 2400,
    rollIn: 1300,
    earTwitchPause: 900,
    rollBack: 1100,
    beforeDrop: 600,
    oneEyePause: 900,
    lookPause: 520,
    ohHold: 1200,
    todayHold: 1600,
  },

  mission: {
    scan: 900,
    rowStagger: 260,
    operationHold: 1700,
    salute: 1600,
    objectiveHold: 1200,
    suitUp: 1400,
    startHold: 1200,
  },

  training: {},
  poke: {},
  days: {},
  match: {},
  finalShot: {},
  podium: {},
  quiet: {},
  goodLuck: {},
  ending: {},
};
