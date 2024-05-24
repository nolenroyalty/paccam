export const WAITING_FOR_VIDEO = "waiting-for-video";
export const WAITING_FOR_PLAYER_SELECT = "waiting-for-player-select";
export const WAITING_TO_START_ROUND = "waiting-to-start-round";
export const COUNTING_IN_ROUND = "counting-in-round";
export const RUNNING_ROUND = "running-round";
export const COMPLETED_ROUND = "completed-round";
export const SHOWING_RESULTS = "showing-results";
export const STOPPED = "stopped";

export function validTransition({ from, to }) {
  if (from === WAITING_FOR_VIDEO && to === WAITING_FOR_PLAYER_SELECT) {
    return true;
  } else if (
    from === WAITING_FOR_PLAYER_SELECT &&
    to === WAITING_TO_START_ROUND
  ) {
    return true;
  } else if (from === WAITING_TO_START_ROUND && to === COUNTING_IN_ROUND) {
    return true;
  } else if (from === COUNTING_IN_ROUND && to === RUNNING_ROUND) {
    return true;
  } else if (from === RUNNING_ROUND && to === COMPLETED_ROUND) {
    return true;
  } else if (from === COMPLETED_ROUND && to === SHOWING_RESULTS) {
    return true;
  } else if (from === SHOWING_RESULTS && to === WAITING_FOR_PLAYER_SELECT) {
    return true;
  } else if (to === STOPPED) {
    return true;
  } else if (from === to) {
    console.log(`Transition from state to itself? ${from}`);
    return true;
  }
  return false;
}

export function shouldProcessGameLoop(status) {
  if (
    status === RUNNING_ROUND ||
    status === COUNTING_IN_ROUND ||
    status === WAITING_TO_START_ROUND
  ) {
    return true;
  }
  return false;
}
