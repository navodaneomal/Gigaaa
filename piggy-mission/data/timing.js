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
    operationHold: 500, // pause on "Operation: …" before the salute
    salute: 1790, // the whole terrible salute (every step scales with this)
    afterSalute: 240,
    objectiveHold: 1200,
    suitUp: 1000, // four spins, one piece of kit each
    startHold: 1200,
  },

  training: {
    jogIn: 950, // the pig trots onto the court
    labelHold: 1300, // drill labels
    freeze: 420, // the frozen beat after each mishap, before the deadpan look
    gagLine: 1150, // bubble hold for the gag one-liners
    wobble: 950, // stretch: balancing on one leg before it gives up
    dribble: 260, // one dribble, down and up
    jumpCharge: 1250, // the ridiculous wind-up for the tiny jump
    jumpHold: 600, // the victory pose after landing, before it realises
    jumpLine: 1500,
    sprintOut: 430,
    sprintBack: 780,
    tiredWalk: 1500,
    staminaMin: 900, // HUD stays at least this long before the tap prompt
    passFlight: 1500,
    passStare: 1300, // the long silent stare after the ball disappears
    passLine: 1500,
    shotFlight: 900,
    swishHold: 1000,
    celebrate: 1600,
    mirrorBeat: 700,
    nod: 620,
    okayHold: 900,
  },

  poke: {
    intro: 650, // iris settles, then the hint appears
    anywhereAfter: 3000, // after this long without a poke, a tap anywhere counts
    rehintAfter: 2600, // label comes back between pokes
    nudgeAfter: 6000, // the pig nudges an idle viewer
    autoAfter: 12000, // …and then plays the next reaction by itself
    autoTestGap: 1000, // ?auto: pause between simulated pokes
    lineHold: 1300,
    longLineHold: 1750,
    sideEye: 520,
    deadpanPause: 700,
    seriousBeat: 650,
    push: 3400,
    tugHold: 380,
    beforeLine: 650,
    finalPause: 850,
    finalHold: 1100,
  },

  days: {
    enter: 1500, // walk into day 1
    nervous: 1300,
    inhale: 1100,
    exhale: 700,
    titleHold: 900,
    lineHold: 1700,
    travel: 2000, // pan to the next day
    dribbleWalk: 2600,
    sitBeat: 1600,
    standBeat: 600,
    doorsOpen: 1400,
    intoLight: 1900,
  },

  match: {
    runOn: 1400,
    titleHold: 1100,
    catchBeat: 500,
    passFlight: 520,
    lunge: 700,
    dodge: 360,
    whiff: 900,
    drive: 1000,
    landBeat: 700,
    shootHint: 1400,
  },

  finalShot: {
    settle: 700,
    lookHoop: 900,
    lookYou: 900,
    thoughtHold: 1500,
    flight: 1500, // film ms; plays in slow motion
    swishHold: 1100,
    silence: 900,
    winnerHold: 1700,
    celebrate: 1500,
  },

  podium: {
    cardIn: 80, // beat before the 1st-place card flips in
    onTop: 1300,
    trophyDrop: 900,
    lift: 700,
    struggle: 1900,
    afterFall: 800,
    thumbs: 1300,
  },

  quiet: {
    hush: 1300, // the sudden silence before anything moves
    getUp: 1000,
    setDown: 900,
    approach: 2600,
    line: 1500, // default hold per line
    longLine: 2300,
    gap: 450,
  },

  goodLuck: {
    intro: 900,
    line: 1250,
    gap: 280,
    bigHold: 1300,
    firstHold: 1800,
  },

  ending: {
    shadesDrop: 700,
    coolBeat: 900,
    strut: 1700,
    stopBeat: 500,
    turn: 260,
    hoofBeat: 400,
    dontForget: 1400,
    pause: 650,
    trainedYou: 1300,
    tripBeat: 700,
    blackBeat: 600,
    coachHold: 1700,
  },
};
