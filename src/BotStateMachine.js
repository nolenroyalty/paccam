const PLAN = {
  WAITING_FOR_START: "waiting-for-start",
  EATING_DOTS: "eating-dots",
  FLEEING: "fleeing",
  HUNTING: "hunting",
  MOVING_RANDOMLY: "moving-randomly",
};

const DIRECTION = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right",
};

const UPDATE_PLAN_EVERY_MS = (plan) => {
  if (plan === PLAN.WAITING_FOR_START) {
    return 800;
  }
  return 100;
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
    this.mouthIsOpen = false;
    this.numSlots = numSlots;
  }

  getCurrentState() {
    return { direction: this.direction, mouthIsOpen: this.mouthIsOpen };
  }

  maybeUpdatePlan({ now }) {
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

    if (this.plan === PLAN.WAITING_FOR_START) {
      this.updatePlanWaitingForStart();
    }
  }

  updatePlanWaitingForStart() {
    this.direction = randomDirection();
    const rand = Math.random();
    if (rand < 0.4) {
      this.mouthIsOpen = !this.mouthIsOpen;
    }
  }

  advanceToGameStart() {
    const rand = Math.random();
    if (rand < 0.2) {
      this.state = PLAN.MOVING_RANDOMLY;
    } else {
      this.state = PLAN.EATING_DOTS;
    }
  }
}

export default BotStateMachine;
