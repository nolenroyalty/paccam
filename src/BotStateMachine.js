import { BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT } from "./constants";

// You need to open / close your mouth 3.5 times per second to get the full bonus.
// humans don't do this, so we don't want our bots to play perfectly.
const TARGET_TIME_BETWEEN_CHOMPS =
  1000 / (BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT * 1.25);
// but let them be a little more aggressive sometimes :)
const TARGET_TIME_BETWEEN_CHOMPS_AGGRESSIVE =
  1000 / (BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT * 1.1);

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

const GAME_STATE = {
  WAITING_FOR_START: "waiting-for-start",
  RUNNING: "running",
  OVER: "over",
};

const UPDATE_PLAN_EVERY_MS = (plan) => {
  let base = 100;
  let jitterPct = 0.05;
  if (plan === PLAN.WAITING_FOR_START) {
    base = 800;
    jitterPct = 0.5;
  } else if (plan === PLAN.FLEEING) {
    base = 600;
    jitterPct = 0.4;
  }
  if (jitterPct !== null) {
    const rand = 2 * (Math.random() - 0.5);
    return base * (1 + jitterPct * rand);
  } else {
    return base;
  }
};

const EXECUTE_PLAN_EVERY_MS = (plan) => {
  let base = 50;
  let jitterPct = 0.05;
  if (plan === PLAN.WAITING_FOR_START) {
    base = 800;
    jitterPct = 0.5;
  }
  if (jitterPct !== null) {
    const rand = 2 * (Math.random() - 0.5);
    return base * (1 + jitterPct * rand);
  } else {
    return base;
  }
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
  }

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

  moveToHuntOrRandom() {
    const mercyNumber = 0.05;
    const rand = Math.random();
    if (rand < mercyNumber) {
      this.plan = PLAN.MOVING_RANDOMLY;
    } else {
      this.plan = PLAN.HUNTING;
    }
  }

  moveToFleeOrRandom() {
    const stupidNumber = 0.01;
    const rand = Math.random();
    if (rand < stupidNumber) {
      this.plan = PLAN.MOVING_RANDOMLY;
    } else {
      this.plan = PLAN.FLEEING;
    }
  }

  moveToEatOrRandom({ howLikelyToRandom }) {
    const rand = Math.random();
    if (rand < howLikelyToRandom) {
      this.plan = PLAN.MOVING_RANDOMLY;
    } else {
      this.plan = PLAN.EATING_DOTS;
    }
  }

  maybeUpdatePlan({ now, superState }) {
    let shouldUpdate = this.lastUpdatedPlan === null;
    if (this.lastUpdatedPlan !== null) {
      const elapsed = now - this.lastUpdatedPlan;
      const span = UPDATE_PLAN_EVERY_MS(this.plan);
      shouldUpdate = elapsed > span;
    }

    if (!shouldUpdate) {
      return;
    }
    this.lastUpdatedPlan = now;

    if (this.gameState === GAME_STATE.WAITING_FOR_START) {
      if (this.plan === PLAN.WAITING_FOR_START) {
        // nothing...
      } else {
        this.plan = PLAN.WAITING_FOR_START;
      }
    } else if (this.gameState === GAME_STATE.OVER) {
      // I think this doesn't ever come up, but whatever
      this.plan = PLAN.NOTHING;
    } else if (superState === "am-super") {
      this.moveToHuntOrRandom();
    } else if (superState === "other-bot-is-super") {
      // this.moveToFleeOrRandom();
      this.plan = PLAN.FLEEING;
    } else if (superState === "not-super" && this.plan === PLAN.HUNTING) {
      this.moveToEatOrRandom({ howLikelyToRandom: 0.2 });
    } else if (superState === "not-super" && this.plan === PLAN.FLEEING) {
      this.moveToEatOrRandom({ howLikelyToRandom: 0.5 });
    } else if (this.plan === PLAN.MOVING_RANDOMLY) {
      this.moveToEatOrRandom({ howLikelyToRandom: 0.05 });
    } else if (this.plan === PLAN.EATING_DOTS) {
      this.moveToEatOrRandom({ howLikelyToRandom: 0.1 });
    } else {
      console.warn("Unhandled state", this.plan, superState);
    }
    console.log("PLAN", this.plan);
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
    const lastTimeSomethingHappened = this.smoothRandomState[stateKey] || 0;
    const delta = currentTime - lastTimeSomethingHappened;
    let threshold = targetFrequency;
    const smoothVariation = Math.sin(currentTime / 1000) * jitterFactor;
    const randomVariation = (Math.random() * 2 - 1) * jitterFactor;
    threshold *= 1 + (smoothVariation + randomVariation) / 2;
    if (delta > threshold) {
      this.smoothRandomState[stateKey] = currentTime;
      runOnSuccess();
      return true;
    }
    return false;
  }

  maybeChomp({
    now,
    jitterFactor = 0.25,
    targetFrequency = TARGET_TIME_BETWEEN_CHOMPS,
  }) {
    const runOnSuccess = () => {
      this.mouthIsOpen = !this.mouthIsOpen;
    };
    this.smoothlyRandom({
      currentTime: now,
      stateKey: "lastChompTime",
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
  setFleeDirection({ position, playerPositions, superPlayerNum }) {
    // maybe this should account for the direction the player is facing?
    const superPlayerPosition = playerPositions[superPlayerNum].position;
    const superPlayerDirection = playerPositions[superPlayerNum].direction;
    const horizontalFactor =
      superPlayerDirection === "left" || superPlayerDirection === "right"
        ? 1.25
        : 1;
    const verticalFactor =
      superPlayerDirection === "up" || superPlayerDirection === "down"
        ? 1.25
        : 1;
    const rightDist = this.rightDistance({
      me: position,
      them: superPlayerPosition,
    });
    const leftDist = this.leftDistance({
      me: position,
      them: superPlayerPosition,
    });
    const upDist = this.upDistance({
      me: position,
      them: superPlayerPosition,
    });
    const downDist = this.downDistance({
      me: position,
      them: superPlayerPosition,
    });
    const leftWeight = leftDist ** 2.5 * horizontalFactor;
    const rightWeight = rightDist ** 2.5 * horizontalFactor;
    const upWeight = upDist ** 2.5 * verticalFactor;
    const downWeight = downDist ** 2.5 * verticalFactor;
    const total = leftWeight + rightWeight + upWeight + downWeight;
    const rand = Math.random() * total;

    if (rand < leftWeight) {
      this.direction = DIRECTION.LEFT;
    } else if (rand < leftWeight + rightWeight) {
      this.direction = DIRECTION.RIGHT;
    } else if (rand < leftWeight + rightWeight + upWeight) {
      this.direction = DIRECTION.UP;
    } else {
      this.direction = DIRECTION.DOWN;
    }
  }

  maybeExecutePlan({
    now,
    pellets,
    position,
    playerPositions,
    superPlayerNum,
  }) {
    // let shouldExecute = this.lastExecutedPlan === null;
    // if (this.lastExecutedPlan !== null) {
    //   const elapsed = now - this.lastExecutedPlan;
    //   const span = EXECUTE_PLAN_EVERY_MS(this.plan);
    //   shouldExecute = elapsed > span;
    // }

    // if (!shouldExecute) {
    //   return;
    // }
    // this.lastExecutedPlan = now;

    if (this.plan === PLAN.WAITING_FOR_START) {
      // this.executePlanWaitingForStart();
      this.maybeChomp({ now });
    } else if (this.plan === PLAN.MOVING_RANDOMLY) {
      // this.maybeOpenOrCloseMouth({ chance: 0.5 });
      this.maybeChomp({ now });
      // this.direction = randomDirection();
    } else if (this.plan === PLAN.EATING_DOTS) {
      this.maybeChomp({ now });
    } else if (this.plan === PLAN.FLEEING) {
      // this.maybeOpenOrCloseMouth({ chance: 0.95 });
      this.maybeChomp({ now });
      const shouldChangeDirection = this.smoothlyRandom({
        currentTime: now,
        stateKey: "lastFleeDirectionChange",
        targetFrequency: 510,
      });
      if (shouldChangeDirection) {
        this.setFleeDirection({ position, playerPositions, superPlayerNum });
      }
    } else if (this.plan === PLAN.HUNTING) {
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
    const superState = thisBotIsSuper
      ? "am-super"
      : superIsActive
        ? "other-bot-is-super"
        : "not-super";
    this.maybeUpdatePlan({ now, superState });
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
