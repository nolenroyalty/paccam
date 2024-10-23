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
  }
  if (jitterPct !== null) {
    const rand = 2 * (Math.random() - 0.5);
    return base * (1 + jitterPct * rand);
  } else {
    return base;
  }
};

const EXECUTE_PLAN_EVERY_MS = (plan) => {
  let base = 100;
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
  }

  getCurrentState() {
    return { direction: this.direction, mouthIsOpen: this.mouthIsOpen };
  }

  moveToHuntOrRandom() {
    const mercyNumber = 0.1;
    const rand = Math.random();
    if (rand < mercyNumber) {
      this.plan = PLAN.MOVING_RANDOMLY;
    } else {
      this.plan = PLAN.HUNTING;
    }
  }

  moveToFleeOrRandom() {
    const stupidNumber = 0.1;
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
      this.moveToFleeOrRandom();
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

  executePlanWaitingForStart() {
    this.direction = randomDirection();
    const rand = Math.random();
    if (rand < 0.4) {
      this.mouthIsOpen = !this.mouthIsOpen;
    }
  }

  maybeExecutePlan({ now }) {
    let shouldExecute = this.lastExecutedPlan === null;
    if (this.lastExecutedPlan !== null) {
      const elapsed = now - this.lastExecutedPlan;
      const span = EXECUTE_PLAN_EVERY_MS(this.plan);
      shouldExecute = elapsed > span;
    }

    if (!shouldExecute) {
      return;
    }
    this.lastExecutedPlan = now;

    if (this.plan === PLAN.WAITING_FOR_START) {
      this.executePlanWaitingForStart();
    }
  }

  maybeUpdateAndExecutePlan({
    now,
    pellets,
    position,
    thisBotIsSuper,
    superIsActive,
  }) {
    const superState = thisBotIsSuper
      ? "am-super"
      : superIsActive
        ? "other-bot-is-super"
        : "not-super";
    this.maybeUpdatePlan({ now, superState });
    this.maybeExecutePlan({ now });
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
