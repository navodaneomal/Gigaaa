/*
 * The Referee's Final Call: tunable values.
 *
 * Everything that affects difficulty or pacing lives here, so the
 * experience can be tuned without touching the game code.
 */
(function () {
  'use strict';

  window.RFC_CONFIG = {
    names: {
      player: 'Chooty Bole',
      referee: 'Matta (Gon Satha)',
      refereeShort: 'Matta',
      opponent: "Referee's Team",
    },

    // Netball mini-game
    match: {
      seconds: 90, // length of the match clock
      targetGoals: 5, // goals needed to win
      extraTimeSeconds: 45, // added when the clock runs out before the target
      opponentFinalScore: 3, // the referee's team always "ends up" on this score
    },

    player: {
      speed: 5.4, // metres per second
    },

    defender: {
      speed: 3.7, // slower than the player, so a good lead always gets free
      reaction: 0.3, // seconds of lag behind the player's movement
      markDistance: 1.0, // how close the defender tries to stay when marking
    },

    pass: {
      openLane: 0.85, // metres the defender must be away from the passing lane
      interceptChance: 0.6, // chance a pass into a covered lane is picked off
      speed: 13, // metres per second
    },

    shot: {
      fillSeconds: 1.05, // time for the power meter to go from empty to full
      zoneHalfWidth: 0.14, // half-width of the green "perfect power" zone (0..1)
      nearMiss: 0.08, // extra band either side that clips the rim
      defenderPressure: 0.03, // zone shrink when the defender is right in front
    },

    possessionSeconds: 4, // netball's three-second rule, with a referee's discount

    // Applied once per extra-time period so nobody gets stuck
    easingPerExtraTime: {
      zoneHalfWidth: 0.05,
      interceptChance: -0.25,
      defenderSpeed: -0.5,
    },

    // Four-day puzzle
    fourDay: {
      startEnergy: 5,
      maxEnergy: 6,
      targetMomentum: 7,
      actions: {
        push: { label: 'Push', energy: -3, momentum: 3, hint: 'All in. Costs a lot.' },
        attack: { label: 'Attack', energy: -2, momentum: 2, hint: 'Go after it.' },
        defend: { label: 'Defend', energy: -1, momentum: 1, hint: 'Hold the line.' },
        recover: { label: 'Recover', energy: 3, momentum: 0, hint: 'Breathe. Refill.' },
      },
    },

    storageKey: 'rfc.progress.v1',
  };
})();
