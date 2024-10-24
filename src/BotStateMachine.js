import {
  BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT,
  PLAYER_SIZE_IN_SLOTS,
  BASE_SLOTS_MOVED_PER_SECOND,
  BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT,
  SPEED_MULTIPLIER_IF_SUPER,
  DEFAULT_SUPER_DURATION,
} from "./constants";

// You need to open / close your mouth 3.5 times per second to get the full bonus.
// humans don't do this, so we don't want our bots to play perfectly.
const TARGET_TIME_BETWEEN_CHOMPS =
  1000 / (BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT * 1.25);
// but let them be a little more aggressive sometimes :)
const TARGET_TIME_BETWEEN_CHOMPS_AGGRESSIVE =
  1000 / (BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT * 1.1);

const OVERLAP_THRESHOLD = PLAYER_SIZE_IN_SLOTS / 16;

const PLAN = {
  WAITING_FOR_START: "waiting-for-start",
  EATING_DOTS: "eating-dots",
  FLEEING: "fleeing",
  HUNTING: "hunting",
  MOVING_RANDOMLY: "moving-randomly",
  NOTHING: "nothing",
};

const DIRECTION = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right",
};

const directionHorizontal = (direction) =>
  direction === DIRECTION.LEFT || direction === DIRECTION.RIGHT;
const directionVertical = (direction) =>
  direction === DIRECTION.UP || direction === DIRECTION.DOWN;

const GAME_STATE = {
  WAITING_FOR_START: "waiting-for-start",
  RUNNING: "running",
  OVER: "over",
};

function randomDirection() {
  const rand = Math.random();
  if (rand < 0.25) {
    return DIRECTION.UP;
  } else if (rand < 0.5) {
    return DIRECTION.DOWN;
  } else if (rand < 0.75) {
    return DIRECTION.LEFT;
  } else {
    return DIRECTION.RIGHT;
  }
}

class BotStateMachine {
  constructor({ playerNum, numSlots }) {
    this.playerNum = playerNum;
    this.plan = PLAN.WAITING_FOR_START;
    this.direction = DIRECTION.RIGHT;
    this.lastUpdatedPlan = null;
    this.lastExecutedPlan = null;
    this.mouthIsOpen = false;
    this.numSlots = numSlots;
    this.gameState = GAME_STATE.WAITING_FOR_START;
    this.lastChompTime = 0;
    this.smoothRandomState = {};
    this.targetPelletState = null;
    this.huntingState = null;
  }

  // these distance functions can potentially return negative results
  // if a point is off the side of the screen. let's not worry about that too much.

  leftDistance({ me, them }) {
    // if we're to their right, the distance is just our loc minus their loc
    // them . . . . . me
    // if we're to their left, the distance is our loc to 0 + (end - them)
    // . me . . them . .
    return me.x === them.x
      ? 0
      : me.x > them.x
        ? me.x - them.x
        : this.numSlots.horizontal - them.x + me.x;
  }

  rightDistance({ me, them }) {
    return this.leftDistance({ me: them, them: me });
  }

  upDistance({ me, them }) {
    // if we're below them, the distance is just our loc minus their loc
    // them
    // .
    // .
    // me
    // if we're above them, the distance is our loc to 0 + (end - them)
    // .
    // me
    // .
    // .
    // them
    // .
    return me.y === them.y
      ? 0
      : me.y > them.y
        ? me.y - them.y
        : this.numSlots.vertical - them.y + me.y;
  }

  downDistance({ me, them }) {
    return this.upDistance({ me: them, them: me });
  }

  getCurrentState() {
    return { direction: this.direction, mouthIsOpen: this.mouthIsOpen };
  }

  clearStateForOldPlan({ oldPlan }) {
    if (oldPlan === PLAN.EATING_DOTS) {
      this.targetPelletState = null;
    } else if (oldPlan === PLAN.HUNTING) {
      this.huntingState = null;
    }
  }

  maybeUpdatePlan({ now, superState, positions, playerPositions }) {
    // let shouldUpdate = this.lastUpdatedPlan === null;
    // if (this.lastUpdatedPlan !== null) {
    //   const elapsed = now - this.lastUpdatedPlan;
    //   const span = UPDATE_PLAN_EVERY_MS(this.plan);
    //   shouldUpdate = elapsed > span;
    // }

    // if (!shouldUpdate) {
    //   return;
    // }
    this.lastUpdatedPlan = now;
    const currentPlan = this.plan;
    let newPlan = null;

    if (this.gameState === GAME_STATE.WAITING_FOR_START) {
      if (this.plan === PLAN.WAITING_FOR_START) {
        // nothing...
      } else {
        newPlan = PLAN.WAITING_FOR_START;
      }
    } else if (this.gameState === GAME_STATE.OVER) {
      // I think this doesn't ever come up, but whatever
      newPlan = PLAN.NOTHING;
    } else if (superState === "am-super" && this.plan === PLAN.HUNTING) {
      // ideal logic here is like:
      // if I'm hunting and already have a target, stay with it for ~2.5 seconds
      // if I'm not hunting, aim to start hunting within a second
      // if I'm hunting and there's no good target, consider eating rando dots
      const shouldMoveToRandom = this.smoothlyRandom({
        currentTime: now,
        stateKey: "huntingMovedToRandom",
        targetFrequency: 2750,
        jitterFactor: 0.5,
      });
      if (shouldMoveToRandom) {
        newPlan = PLAN.MOVING_RANDOMLY;
      } else {
        newPlan = PLAN.HUNTING;
      }
    } else if (
      superState === "am-super" &&
      this.plan === PLAN.MOVING_RANDOMLY
    ) {
      const shouldMoveToHunting = this.smoothlyRandom({
        currentTime: now,
        stateKey: "randomMovedToHunting",
        targetFrequency: 350,
      });
      if (shouldMoveToHunting) {
        newPlan = PLAN.HUNTING;
      }
    } else if (superState === "am-super" && this.plan === PLAN.EATING_DOTS) {
      const shouldMoveToFlee = this.smoothlyRandom({
        currentTime: now,
        stateKey: "eatingMovedToHunting",
        targetFrequency: 300,
      });
      if (shouldMoveToFlee) {
        newPlan = PLAN.HUNTING;
      }
    } else if (superState === "other-bot-is-super") {
      // this.moveToFleeOrRandom();
      newPlan = PLAN.FLEEING;
    } else if (superState === "not-super" && this.plan === PLAN.HUNTING) {
      newPlan = PLAN.EATING_DOTS;
      // this.moveToEatOrRandom({ howLikelyToRandom: 0.2 });
      // newPlan = this.stateOrRandom({
      //   state: PLAN.EATING_DOTS,
      //   howLikelyToRandom: 0.05,
      // });
    } else if (superState === "not-super" && this.plan === PLAN.FLEEING) {
      newPlan = PLAN.EATING_DOTS;
      // newPlan = this.stateOrRandom({
      //   state: PLAN.EATING_DOTS,
      //   howLikelyToRandom: 0.05,
      // });
    } else if (this.plan === PLAN.MOVING_RANDOMLY) {
      newPlan = PLAN.EATING_DOTS;
      // newPlan = this.stateOrRandom({
      //   state: PLAN.EATING_DOTS,
      //   howLikelyToRandom: 0.05,
      // });
    } else if (this.plan === PLAN.EATING_DOTS) {
      newPlan = PLAN.EATING_DOTS;
      // newPlan = this.stateOrRandom({
      // state: PLAN.EATING_DOTS,
      // howLikelyToRandom: 0.05,
      // });
    } else {
      console.warn("Unhandled state", this.plan, superState, newPlan);
    }
    if (newPlan !== null && newPlan !== this.plan) {
      console.log(`UPDATING PLAN: ${this.plan} -> ${newPlan}`);
      this.clearStateForOldPlan({ oldPlan: currentPlan });
      this.plan = newPlan;
    }
  }

  maybeOpenOrCloseMouth({ chance }) {
    const rand = Math.random();
    if (rand < chance) {
      this.mouthIsOpen = !this.mouthIsOpen;
    }
  }

  smoothlyRandom({
    currentTime,
    stateKey,
    targetFrequency,
    jitterFactor = 0.25,
    runOnSuccess = () => {},
  }) {
    if (!this.smoothRandomState[stateKey]) {
      this.smoothRandomState[stateKey] = {
        lastTimeSomethingHappened: 0,
        targetDelta: null,
      };
    }
    const lastTimeSomethingHappened =
      this.smoothRandomState[stateKey].lastTimeSomethingHappened;

    if (this.smoothRandomState[stateKey].targetDelta === null) {
      let threshold = targetFrequency;
      const smoothVariation = Math.sin(currentTime / 1000) * jitterFactor;
      const randomVariation = (Math.random() * 2 - 1) * jitterFactor;
      threshold *= 1 + (smoothVariation + randomVariation) / 2;
      this.smoothRandomState[stateKey].targetDelta = threshold;
    }

    const delta = currentTime - lastTimeSomethingHappened;
    if (delta > this.smoothRandomState[stateKey].targetDelta) {
      this.smoothRandomState[stateKey].lastTimeSomethingHappened = currentTime;
      this.smoothRandomState[stateKey].targetDelta = null;
      runOnSuccess();
      return true;
    }
    return false;
  }

  maybeChomp({
    now,
    jitterFactor = 0.25,
    targetFrequency = TARGET_TIME_BETWEEN_CHOMPS,
    chompKey = "playing",
  }) {
    const runOnSuccess = () => {
      this.mouthIsOpen = !this.mouthIsOpen;
    };
    this.smoothlyRandom({
      currentTime: now,
      stateKey: `${chompKey}-lastChompTime`,
      targetFrequency,
      jitterFactor,
      runOnSuccess,
    });
  }

  executePlanWaitingForStart() {
    this.direction = randomDirection();
    this.maybeOpenOrCloseMouth({ chance: 0.35 });
  }

  // Compute the distance between us and the super player and choose a
  // random direction, heavily weighted towards the direction that will
  // increase the distance.
  determineFleeDirection({ position: me, playerPositions, superPlayerNum }) {
    const them = playerPositions[superPlayerNum].position;
    const superPlayerDirection = playerPositions[superPlayerNum].direction;
    const rightScale = superPlayerDirection === "right" ? 1.2 : 1;
    const leftScale = superPlayerDirection === "left" ? 1.2 : 1;
    const upScale = superPlayerDirection === "up" ? 1.2 : 1;
    const downScale = superPlayerDirection === "down" ? 1.2 : 1;

    const keys = [
      {
        direction: DIRECTION.LEFT,
        score: this.leftDistance({ me, them }) * leftScale,
      },
      {
        direction: DIRECTION.RIGHT,
        score: this.rightDistance({ me, them }) * rightScale,
      },
      {
        direction: DIRECTION.UP,
        score: this.upDistance({ me, them }) * upScale,
      },
      {
        direction: DIRECTION.DOWN,
        score: this.downDistance({ me, them }) * downScale,
      },
    ];
    return this.weightedRandomChoiceFromList({
      list: keys,
      logKey: "setFleeDirection",
      scoreScaleFactor: 3,
    }).direction;
  }

  manhattanDistance(a, b) {
    const left = this.leftDistance({ me: a, them: b });
    const right = this.rightDistance({ me: a, them: b });
    const up = this.upDistance({ me: a, them: b });
    const down = this.downDistance({ me: a, them: b });
    return Math.min(left, right) + Math.min(up, down);
  }

  // maybe this should treat distances < player radius as 0
  determineEatTarget({ position, pellets }) {
    const pelletValue = (pellet) => {
      if (pellet.kind === "pellet") {
        return 1;
      } else if (pellet.kind === "fruit") {
        return 3;
      } else if (pellet.kind === "power-pellet") {
        return 20;
      } else {
        throw new Error(`Unknown pellet kind: ${pellet.kind}`);
      }
    };

    const scoredPellets = Object.values(pellets)
      .filter((p) => p.enabled)
      .map((p) => {
        const dist = this.manhattanDistance(position, { x: p.x, y: p.y });
        const score = pelletValue(p) / dist ** 3;
        return { ...p, dist, score };
      });
    // inverse sort
    scoredPellets.sort((a, b) => b.score - a.score);
    let candidates = scoredPellets.slice(0, 6);
    const hasPowerPellet = candidates.some((p) => p.kind === "power-pellet");
    if (!hasPowerPellet) {
      const powerPellet = scoredPellets.find((p) => p.kind === "power-pellet");
      if (powerPellet) {
        candidates = candidates.slice(0, 5);
        candidates.push(powerPellet);
      }
    }
    const choice = this.weightedRandomChoiceFromList({
      list: candidates,
      logKey: "determineEatTarget",
      scoreScaleFactor: 1,
    });
    return { x: choice.x, y: choice.y, key: [choice.x, choice.y] };
  }

  getMyDistanceToOtherPlayers({ playerPositions, position }) {
    return Object.values(playerPositions)
      .filter((p) => p.playerNum !== this.playerNum)
      .map((p) => {
        return {
          ...p,
          distance: this.manhattanDistance(position, p.position),
        };
      });
  }

  weightedRandomChoiceFromList({ list, logKey, scoreScaleFactor = 1 }) {
    if (list.length === 0) {
      console.warn(
        `Asked to choose a direction but no valid choices (key: ${logKey})`
      );
      return null;
    }
    const scaled = list.map((item) => ({
      ...item,
      score: item.score ** scoreScaleFactor,
    }));
    const total = scaled.reduce((acc, item) => acc + item.score, 0);
    const rand = Math.random() * total;
    let runningTotal = 0;
    for (let i = 0; i < list.length; i++) {
      runningTotal += scaled[i].score;
      if (rand < runningTotal) {
        return list[i];
      }
    }
    console.log(
      `NO RETURN?? ${logKey} ${rand} ${runningTotal} ${total} ${JSON.stringify(list)} | ${JSON.stringify(scaled)}`
    );
  }

  alreadyOverlapsHorizontally({ me, them }) {
    const left = this.leftDistance({ me, them });
    const right = this.rightDistance({ me, them });
    return Math.min(left, right) <= OVERLAP_THRESHOLD;
  }

  alreadyOverlapsVertically({ me, them }) {
    const up = this.upDistance({ me, them });
    const down = this.downDistance({ me, them });
    return Math.min(up, down) <= OVERLAP_THRESHOLD;
  }

  determineDirectionToTarget({
    position,
    target,
    distanceScaleFactor,
    targetDirection = "no-direction",
  }) {
    const left = this.leftDistance({ me: position, them: target });
    const right = this.rightDistance({ me: position, them: target });
    const up = this.upDistance({ me: position, them: target });
    const down = this.downDistance({ me: position, them: target });
    const leftScale = targetDirection === DIRECTION.RIGHT ? 1.15 : 1;
    const rightScale = targetDirection === DIRECTION.LEFT ? 1.15 : 1;
    const upScale = targetDirection === DIRECTION.DOWN ? 1.15 : 1;
    const downScale = targetDirection === DIRECTION.UP ? 1.15 : 1;

    // We want directions that will get us to the target most quickly (closer)
    // to be more desirable, so our score inverts the distance.
    // We don't want to move in a direction if we already overlap with the target,
    // so filter things out (there we respect the smaller of the two directions)
    const keys = [
      {
        key: DIRECTION.LEFT,
        filterValue: Math.min(left, right),
        score: (this.numSlots.horizontal - left) * leftScale,
      },
      {
        key: DIRECTION.RIGHT,
        filterValue: Math.min(left, right),
        score: (this.numSlots.horizontal - right) * rightScale,
      },
      {
        key: DIRECTION.UP,
        filterValue: Math.min(up, down),
        score: (this.numSlots.vertical - up) * upScale,
      },
      {
        key: DIRECTION.DOWN,
        filterValue: Math.min(up, down),
        score: (this.numSlots.vertical - down) * downScale,
      },
    ].filter((d) => d.filterValue > OVERLAP_THRESHOLD);

    if (keys.length === 0) {
      console.warn(
        `Asked to choose a direction to target but we should already overlap! ${JSON.stringify(position)} ${JSON.stringify(target)}`
      );
      return null;
    } else if (keys.length === 1) {
      return keys[0].key;
    } else {
      // Higher distance is a less desirable target, so our score is the square
      // of the *other* distance
      return this.weightedRandomChoiceFromList({
        list: keys,
        logKey: "determineDirectionToTarget",
        scoreScaleFactor: distanceScaleFactor,
      }).key;
    }
  }

  orientTowardsTarget({
    position,
    target,
    distanceScaleFactor,
    targetState,
    pickNewEvenIfAlreadyChoseDirection,
    targetDirection = "no-direction",
  }) {
    let { chosenDirection } = targetState;
    let pickNew =
      chosenDirection === null || pickNewEvenIfAlreadyChoseDirection;
    let wasFirst = chosenDirection === null;
    if (chosenDirection !== null) {
      pickNew =
        (this.alreadyOverlapsHorizontally({
          me: position,
          them: target,
        }) &&
          directionHorizontal(chosenDirection)) ||
        (this.alreadyOverlapsVertically({
          me: position,
          them: target,
        }) &&
          directionVertical(chosenDirection));
    }
    if (pickNew) {
      chosenDirection = this.determineDirectionToTarget({
        position,
        target,
        distanceScaleFactor,
        targetDirection,
      });
      if (chosenDirection === null) {
        targetState.chosenDirection = null;
        return "already-overlaps";
      } else {
        targetState.chosenDirection = chosenDirection;
        this.direction = chosenDirection;
        return wasFirst ? "chose-first-direction" : "chose-new-direction";
      }
    }
  }

  determineHuntingTarget({ position, playerPositions }) {
    const maxTargetMovementDuringSuper =
      DEFAULT_SUPER_DURATION *
      (BASE_SLOTS_MOVED_PER_SECOND +
        BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT);
    const maxMyMovementDuringSuper =
      maxTargetMovementDuringSuper * SPEED_MULTIPLIER_IF_SUPER;
    const reasonableTargetDistance =
      5 * (maxMyMovementDuringSuper - maxTargetMovementDuringSuper);

    const dd = this.getMyDistanceToOtherPlayers({
      playerPositions,
      position,
    });
    const distances = this.getMyDistanceToOtherPlayers({
      playerPositions,
      position,
    }).filter((d) => d.distance < reasonableTargetDistance);

    const scores = distances.map((d) => {
      const score = (reasonableTargetDistance - d.distance) ** 2;
      return { ...d, score };
    });
    console.log(
      `JS: ${JSON.stringify(scores)} || ${JSON.stringify(dd)} || ${reasonableTargetDistance}`
    );
    const total = scores.reduce((acc, s) => acc + s.score, 0);
    const rand = Math.random() * total;
    let runningTotal = 0;
    for (let i = 0; i < scores.length; i++) {
      runningTotal += scores[i].score;
      if (rand < runningTotal) {
        console.log(`CHOSE TARGET: ${JSON.stringify(scores[i])}`);
        return scores[i].playerNum;
      }
      console.log(
        `SKIP ${total} ${rand} ${runningTotal} ${JSON.stringify(scores[i])}`
      );
    }
    console.log("FELL THROUGH");
  }

  moveTowardsPellet({ position, pelletPosition, targetState }) {
    const left = this.leftDistance({ me: position, them: pelletPosition });
    const right = this.rightDistance({ me: position, them: pelletPosition });
    const up = this.upDistance({ me: position, them: pelletPosition });
    const down = this.downDistance({ me: position, them: pelletPosition });
    const horizontal = Math.min(left, right);
    const vertical = Math.min(up, down);

    let { chosenDirection } = targetState;
    const horizontalCompleted =
      chosenDirection !== null &&
      horizontal <= OVERLAP_THRESHOLD &&
      directionHorizontal(chosenDirection);
    const verticalCompleted =
      chosenDirection !== null &&
      vertical <= OVERLAP_THRESHOLD &&
      directionVertical(chosenDirection);
    if (chosenDirection === null || horizontalCompleted || verticalCompleted) {
      const keys = [
        { key: DIRECTION.LEFT, value: left, min: horizontal },
        { key: DIRECTION.RIGHT, value: right, min: horizontal },
        { key: DIRECTION.UP, value: up, min: vertical },
        { key: DIRECTION.DOWN, value: down, min: vertical },
      ].filter((d) => d.min > OVERLAP_THRESHOLD);
      if (keys.length === 0) {
        console.warn(
          `moveTowardsPellet: No valid directions to move ${JSON.stringify(position)} ${JSON.stringify(pelletPosition)}`
        );
        return;
      }
      keys.sort((a, b) => a.value - b.value);
      const { key } = keys[0];
      chosenDirection = key;
      targetState.chosenDirection = chosenDirection;
      this.direction = chosenDirection;
    }
  }

  maybeExecutePlan({
    now,
    pellets,
    position,
    playerPositions,
    superPlayerNum,
  }) {
    if (this.plan === PLAN.WAITING_FOR_START) {
      this.smoothlyRandom({
        currentTime: now,
        stateKey: "lastWaitDirectionChange",
        targetFrequency: 2200,
        runOnSuccess: () => {
          this.direction = randomDirection();
        },
      });
      this.maybeChomp({ now, targetFrequency: 750, chompKey: "waiting" });
    } else if (this.plan === PLAN.MOVING_RANDOMLY) {
      this.maybeChomp({ now });
      this.smoothlyRandom({
        currentTime: now,
        stateKey: "lastRandomDirectionChange",
        targetFrequency: 2500,
        runOnSuccess: () => {
          this.direction = randomDirection();
        },
      });
    } else if (this.plan === PLAN.EATING_DOTS) {
      this.maybeChomp({ now });
      const hasPellet = () => {
        if (this.targetPelletState === null) {
          return false;
        }
        const { target } = this.targetPelletState;
        return pellets[target.key] && pellets[target.key].enabled;
      };

      if (!hasPellet()) {
        this.smoothlyRandom({
          currentTime: now,
          stateKey: "lastEatTargetChoice",
          targetFrequency: 400,
          runOnSuccess: () => {
            // console.log("PICKING TARGET");
            const target = this.determineEatTarget({ position, pellets });
            // console.log(
            //   `TARGET: ${JSON.stringify(target)} | ${JSON.stringify(pellets[target.key])}`
            // );
            this.targetPelletState = { target, chosenDirection: null };
          },
        });
      } else {
        // console.log(`HAS PELLET: ${JSON.stringify(this.targetPelletState)}
        // | ${JSON.stringify(pellets[this.targetPelletState.target.key])}
        // | ${JSON.stringify(position)}
        // `);
      }
      if (hasPellet()) {
        this.moveTowardsPellet({
          position,
          pelletPosition: this.targetPelletState.target,
          targetState: this.targetPelletState,
        });
      }
    } else if (this.plan === PLAN.FLEEING) {
      this.maybeChomp({ now });
      this.smoothlyRandom({
        currentTime: now,
        stateKey: "lastFleeDirectionChange",
        targetFrequency: 510,
        runOnSuccess: () => {
          this.direction = this.determineFleeDirection({
            position,
            playerPositions,
            superPlayerNum,
          });
        },
      });
    } else if (this.plan === PLAN.HUNTING) {
      this.maybeChomp({
        now,
        targetFrequency: TARGET_TIME_BETWEEN_CHOMPS_AGGRESSIVE,
        chompKey: "hunting",
      });
      const hasTarget = () => {
        if (this.huntingState === null || this.huntingState.target === null) {
          return false;
        }
        const target = this.huntingState.target;
        const player = playerPositions.find((p) => p.playerNum === target);
        return !player.isEaten;
      };
      if (!hasTarget()) {
        this.smoothlyRandom({
          currentTime: now,
          stateKey: "lastHuntTargetChoice",
          targetFrequency: 200,
          runOnSuccess: () => {
            const target = this.determineHuntingTarget({
              position,
              playerPositions,
            });
            this.huntingState = { target, chosenDirection: null };
          },
        });
      }

      if (hasTarget()) {
        const player = playerPositions.find(
          (p) => p.playerNum === this.huntingState.target
        );
        const canReorient = this.smoothlyRandom({
          currentTime: now,
          stateKey: "lastHuntReorient",
          targetFrequency: 500,
        });
        this.orientTowardsTarget({
          position,
          target: player.position,
          distanceScaleFactor: 2.5,
          targetState: this.huntingState,
          pickNewEvenIfAlreadyChoseDirection: canReorient,
          targetDirection: player.direction,
        });
      }
    } else if (this.plan === PLAN.NOTHING) {
    } else {
      console.warn("Unhandled state", this.plan);
    }
  }

  maybeUpdateAndExecutePlan({
    now,
    pellets,
    position,
    playerPositions,
    thisBotIsSuper,
    superIsActive,
    superPlayerNum,
  }) {
    let superState = "not-super";
    if (superIsActive) {
      superState = thisBotIsSuper ? "am-super" : "other-bot-is-super";
    }
    this.maybeUpdatePlan({ now, superState, position, playerPositions });
    this.maybeExecutePlan({
      now,
      pellets,
      position,
      playerPositions,
      superPlayerNum,
    });
  }

  advanceToGameStart() {
    const rand = Math.random();
    if (rand < 0.2) {
      this.plan = PLAN.MOVING_RANDOMLY;
    } else {
      this.plan = PLAN.EATING_DOTS;
    }
    this.gameState = GAME_STATE.RUNNING;
  }
}

export default BotStateMachine;
