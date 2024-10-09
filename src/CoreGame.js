import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  PLAYER_SIZE_IN_SLOTS,
  SLOTS_MOVED_PER_MOUTH_MOVE,
  BASE_SLOTS_MOVED_PER_SECOND,
  BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT,
} from "./constants";
import { range, easeOutPow } from "./utils";
import {
  WAITING_FOR_VIDEO,
  WAITING_FOR_PLAYER_SELECT,
  WAITING_TO_START_ROUND,
  COUNTING_IN_ROUND,
  RUNNING_ROUND,
  COMPLETED_ROUND,
  SHOWING_RESULTS,
  STOPPED,
  RUNNING_TUTORIAL,
  validTransition,
  shouldProcessGameLoop,
} from "./STATUS";
import { EATEN, GHOST, NORMAL, FADED, SUPER } from "./PACMANSTATE";

const MIN_DETECTION_CONFIDENCE = 0.4;
const MIN_TRACKING_CONFIDENCE = 0.3;
const MIN_SUPPRESSION_THRESHOLD = 0.1;

const SECONDS_IN_ROUND = 30; // 30
const COUNT_IN_TIME = 3; // 3

// this is normally 0.48
const JAW_OPEN_THRESHOLD = 0.36;
const JAW_CLOSE_THRESHOLD = 0.135;
const NOSE_BASE_LOOK_UP_THRESHOLD = 0.42;
const NOSE_BASE_LOOK_DOWN_THRSEHOLD = 0.6;
const MINIMUM_NOSE_UPNESS = 0.33;
const MAXIMUM_NOSE_DOWNNESS = 0.73;
const RANDOM_PELLETS = true;
const SPAWN_STRAWBERRIES = true;
const SPECIAL_STARTING_SPAWN_CHANCE = 0.05;
const SPECIAL_RESPAWN_CHANCE = 0.15; // 0.2
const SPECIAL_IS_A_FRUIT_CHANCE = 1.0; // 0.7
const STRAWBERRY_POINTS = 3;
const DEFAULT_SUPER_DURATION = 5.3;
const EAT_RECOVERY_TIME = 1.5;
const IMMEDIATELY_EAT = false;
const MAX_PLAYERS = 4;
const TIME_TO_TOGGLE_BETWEEN_GHOST_STATES = 400;
const SPEED_MULTIPLIER_IF_SUPER = 1.2;

const SPAWN_SUPERS_AFTER_THIS_MANY_EATS = {
  lower: 8,
  upper: 16,
};

const TUTORIAL_DIRECTIVES = [
  ["left", "wait"],
  // ["up", "wait"],
  // ["right", "wait"],
  // ["down", "wait"],
  // ["left", "chomp"],
  // ["up", "chomp"],
  // ["right", "chomp"],
  ["down", "chomp"],
  ["left", "move"],
  ["up", "move"],
  ["right", "move"],
  ["down", "move"],
];

const MAX_NUMBER_OF_SUPERS_FOR_NUMBER_OF_PLAYERS = ({ numPlayers }) => {
  if (numPlayers === 4) {
    return 3;
  }
  return 2;
};

let didImmediatelyEat = false;

async function createFaceLandmarker({ numFaces }) {
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  async function getLandmarker() {
    return FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "VIDEO",
      numFaces: numFaces,
      minFaceDetectionConfidence: MIN_DETECTION_CONFIDENCE,
      minTrackingConfidence: MIN_TRACKING_CONFIDENCE,
      minSuppressionThreshold: MIN_SUPPRESSION_THRESHOLD,
    });
  }
  return getLandmarker();
}

// We need to invert the x coordinate because the webcam is flipped.
function invertLandmarks(landmarks) {
  return landmarks.map((landmark) => ({
    x: 1 - landmark.x,
    y: landmark.y,
    z: landmark.z,
  }));
}

class GameEngine {
  constructor({ setTutorialInstruction }) {
    this.faceStateConsumers = [];
    this.positionConsumers = [];
    this.pelletConsumers = [];
    this.scoreConsumers = [];
    this.timeConsumers = [];
    this.statusConsumers = [];
    this.debugConsumers = [];
    this.stagedDebugUpdate = [];
    this.playerStates = [];
    this.pacmanStateConsumers = [];
    this.satisfiedTutorialDirectiveTime = null;
    this.tutorialState = null;
    this.pelletsByPosition = {};
    this.superStatus = { player: null, endSuperAt: null };
    this.numSlots = null;
    this.status = WAITING_FOR_VIDEO;
    this.numPlayers = null;
    this.time = null;
    this.ignoreMissingFaces = false;
    this.setTutorialInstruction = setTutorialInstruction;
    this.tutorialState = null;
  }

  _initTutorialState() {
    return {
      directiveIndex: 0,
      satisfiedDirectiveTime: null,
      status: null,
      lastMouthState: null,
      actionSatisfactionCount: 0,
    };
  }

  enableSuper({ playerNum }) {
    const now = performance.now();
    const endSuperAt = now + DEFAULT_SUPER_DURATION * 1000;
    this.sounds.super.currentTime = 0;
    this.sounds.super.play();
    this.superStatus = { playerNum: playerNum, endSuperAt };
    this.disableOtherSuperPellets();
  }

  disableOtherSuperPellets() {
    Object.values(this.pelletsByPosition).forEach((pellet) => {
      if (pellet.kind === "power-pellet") {
        pellet.enabled = false;
      }
    });
    this.updatePelletConsumers();
  }

  stopGame() {
    console.log("STOPPING FULL GAME?");
    this.updateStatusAndConsumers(STOPPED, "stopGame");
  }

  setIgnoreMissingFaces(value) {
    this.ignoreMissingFaces = value;
  }

  initVideo(video) {
    this.video = video;
    this.updateStatusAndConsumers(WAITING_FOR_PLAYER_SELECT, "initVideo");
  }

  initAudio({ sounds }) {
    this.sounds = sounds.current;
  }

  // manually move using the arrow keys; for debugging only
  enableManualMove() {
    const move = (direction, dx, dy) => {
      this.playerStates.forEach((playerState) => {
        playerState.position.x += dx;
        playerState.position.y += dy;
        playerState.direction = direction;
      });
    };

    const wrap = (d) => {
      if (this.playerStates[0].position.x <= -PLAYER_SIZE_IN_SLOTS) {
        this.playerStates[0].position.x += this.numSlots.horizontal;
      }
      if (this.playerStates[0].position.x >= this.numSlots.horizontal) {
        this.playerStates[0].position.x -= this.numSlots.horizontal;
      }
      if (this.playerStates[0].position.y <= -PLAYER_SIZE_IN_SLOTS) {
        this.playerStates[0].position.y += this.numSlots.vertical;
      }
      if (this.playerStates[0].position.y >= this.numSlots.vertical) {
        this.playerStates[0].position.y -= this.numSlots.vertical;
      }
      this.updatePositionConsumers();
    };

    document.addEventListener("keydown", (e) => {
      const incr = 0.25;
      if (e.key === "ArrowLeft") {
        const d = "left";
        move(d, -incr, 0);
        wrap(d);
      } else if (e.key === "ArrowRight") {
        const d = "right";
        move(d, incr, 0);
        wrap(d);
      } else if (e.key === "ArrowUp") {
        const d = "up";
        move(d, 0, -incr);
        wrap(d);
      } else if (e.key === "ArrowDown") {
        const d = "down";
        move(d, 0, incr);
        wrap(d);
      }
    });
  }

  initNumSlots(numSlots) {
    this.numSlots = numSlots;
  }

  _initSpawnSupersAfterThisManyEats({ numPlayers }) {
    const lower = SPAWN_SUPERS_AFTER_THIS_MANY_EATS.lower;
    const upper = SPAWN_SUPERS_AFTER_THIS_MANY_EATS.upper;
    const range = upper - lower;
    const random = Math.random() * range;
    this.spawnSupersAfterThisManyEats = Math.floor(random + lower);
    console.log(
      `SPAWN SUPERS AFTER THIS MANY EATS: ${this.spawnSupersAfterThisManyEats}`
    );
  }

  /* bug here on small screens? */
  spawnLocation({ playerNum, waiting }) {
    const xOffset = waiting ? this.numSlots.horizontal / 4 : 0;
    const yOffset = waiting ? this.numSlots.vertical / 4 : 0;
    if (playerNum === 0) {
      return { x: xOffset, y: yOffset };
    } else if (playerNum === 1) {
      return {
        x: this.numSlots.horizontal - PLAYER_SIZE_IN_SLOTS - xOffset,
        y: yOffset,
      };
    } else if (playerNum === 2) {
      return {
        x: xOffset,
        y: this.numSlots.vertical - PLAYER_SIZE_IN_SLOTS - yOffset,
      };
    } else if (playerNum === 3) {
      return {
        x: this.numSlots.horizontal - PLAYER_SIZE_IN_SLOTS - xOffset,
        y: this.numSlots.vertical - PLAYER_SIZE_IN_SLOTS - yOffset,
      };
    }
  }

  initialState({ playerNum }) {
    const { x, y } = this.spawnLocation({ playerNum, waiting: true });
    return {
      position: { x, y },
      direction: "center",
      tutorialDirection: "center",
      horizontalStrength: 0,
      verticalStrength: 0,
      mouthIsOpen: false,
      slotsToMove: 0,
      score: 0,
      playerNum,
      pacmanState: NORMAL,
      eatRecoveryTime: null,
      forceMove: {
        from: null,
        to: null,
        startTime: null,
        totalTime: null,
      },
    };
  }

  initNumPlayers(numPlayers) {
    if (this.status === RUNNING_TUTORIAL) {
    } else {
      this.updateStatusAndConsumers(WAITING_TO_START_ROUND, "initNumPlayers");
    }
    this.numPlayers = numPlayers;
    this.playerStates = range(numPlayers).map((playerNum) => {
      return this.initialState({ playerNum });
    });
    console.log(`INITIALIZED PLAYERS: ${JSON.stringify(this.playerStates)}`);
    this.updatePositionConsumers();
    this.updateScoreConsumers();
    this._initSpawnSupersAfterThisManyEats({ numPlayers });
  }

  _updateStatusConsumers() {
    this.statusConsumers.forEach((callback) => {
      callback(this.status);
    });
  }

  subscribeToStatus(callback) {
    this.statusConsumers.push(callback);
    callback(this.status);
  }

  subscribeToDebugInfo(callback) {
    this.debugConsumers.push(callback);
  }

  maybeUpdateDebugState({ playerNum, messages }) {
    if (!this.debugConsumers.length > 0) {
      return;
    }
    const stagedUpdate = [];
    stagedUpdate.push(`playerNum: ${playerNum}`);
    messages.forEach(([label, value]) => {
      if (typeof value === "number") {
        stagedUpdate.push(`${label}: ${value.toFixed(2)}`);
      } else {
        stagedUpdate.push(`${label}: ${value}`);
      }
    });
    this.debugConsumers.forEach((callback) => {
      callback({ playerNum, debugState: stagedUpdate });
    });
  }

  subscribeToPacmanState({ playerNum, callback, id }) {
    this.pacmanStateConsumers.push({ playerNum, callback, id });
    callback(this.playerStates[playerNum].pacmanState);
  }

  unsubscribeFromPacmanState({ playerNum, id }) {
    this.pacmanStateConsumers = this.pacmanStateConsumers.filter((consumer) => {
      if (consumer.id === id) {
        if (consumer.playerNum !== playerNum) {
          console.error(
            `ERROR: consumer playerNum ${consumer.playerNum} !== playerNum ${playerNum} but ids match`
          );
        }
        return false;
      }
      return false;
    });
  }

  updateRelevantPacmanStateConsumers({ playerNum }) {
    const state = this.playerStates[playerNum].pacmanState;
    this.pacmanStateConsumers.forEach(
      ({ playerNum: consumerPlayerNum, callback }) => {
        if (playerNum === consumerPlayerNum) {
          callback(state);
        }
      }
    );
  }

  updateRelevantFaceStateConsumers({
    playerNum,
    mouthIsOpen,
    direction,
    horizontalStrength,
    verticalStrength,
    tutorialDirection,
    jawOpenAmount,
    minY,
    maxY,
    minX,
    maxX,
  }) {
    this.faceStateConsumers.forEach(
      ({ playerNum: consumerPlayerNum, callback }) => {
        if (playerNum === consumerPlayerNum) {
          callback({
            mouthIsOpen,
            direction,
            tutorialDirection,
            jawOpenAmount,
            minY,
            maxY,
            minX,
            maxX,
          });
        }
      }
    );
  }

  subscribeToFaceState({ playerNum, callback, id }) {
    this.faceStateConsumers.push({ playerNum, callback, id });
    // We don't store maxY, etc in state so we can't push them a snapshot.
    // seems...fine?
  }

  unsubscribeFromFaceState({ playerNum, id }) {
    this.faceStateConsumers = this.faceStateConsumers.filter((consumer) => {
      if (consumer.id === id) {
        if (consumer.playerNum !== playerNum) {
          console.error(
            `ERROR: consumer playerNum ${consumer.playerNum} !== playerNum ${playerNum} but ids match`
          );
        }
        return false;
      }
      return true;
    });
  }

  maybeDuplicate({ position, direction }) {
    let dupeHorizontal = null;
    let dupeVertical = null;
    let dupeDiagonal = null;
    if (position.x < 0) {
      const dupeX = this.numSlots.horizontal + position.x;
      dupeHorizontal = { x: dupeX, y: position.y };
    } else if (position.x + PLAYER_SIZE_IN_SLOTS > this.numSlots.horizontal) {
      const dupeX = position.x - this.numSlots.horizontal;
      dupeHorizontal = { x: dupeX, y: position.y };
    }
    if (position.y < 0) {
      const dupeY = this.numSlots.vertical + position.y;
      dupeVertical = { x: position.x, y: dupeY };
    } else if (position.y + PLAYER_SIZE_IN_SLOTS > this.numSlots.vertical) {
      const dupeY = position.y - this.numSlots.vertical;
      dupeVertical = { x: position.x, y: dupeY };
    }
    if (dupeVertical !== null && dupeHorizontal !== null) {
      dupeDiagonal = { x: dupeHorizontal.x, y: dupeVertical.y };
    }

    return {
      horizontal: dupeHorizontal,
      vertical: dupeVertical,
      diagonal: dupeDiagonal,
    };
  }

  updatePositionConsumers({
    singleCalback = null,
    singlePlayerNum = null,
  } = {}) {
    const forPlayerNum = ({ playerNum, callback }) => {
      const state = this.playerStates[playerNum];
      if (playerNum !== null && state) {
        const position = this.playerStates[playerNum].position;
        const direction = this.playerStates[playerNum].direction;
        const duped = this.maybeDuplicate({
          position,
          direction,
        });
        callback({ position, duped });
      }
    };

    if (singleCalback && singlePlayerNum !== null) {
      forPlayerNum({ playerNum: singlePlayerNum, callback: singleCalback });
    } else {
      this.positionConsumers.forEach(({ playerNum, callback }) => {
        forPlayerNum({ playerNum, callback });
      });
    }
  }

  subscribeToPosition({ playerNum, callback, id }) {
    this.positionConsumers.push({ playerNum, callback, id });
    this.updatePositionConsumers.bind(this)({
      singleCalback: callback,
      singlePlayerNum: playerNum,
    });
  }

  unsubscribeFromPosition({ playerNum, id }) {
    this.positionConsumers = this.positionConsumers.filter((consumer) => {
      if (consumer.id === id) {
        if (consumer.playerNum !== playerNum) {
          console.error(
            `ERROR: consumer playerNum ${consumer.playerNum} !== playerNum ${playerNum} but ids match`
          );
        }
        return false;
      }
      return true;
    });
  }

  updatePelletConsumers({ singleCallback = null } = {}) {
    const pos = Object.values(this.pelletsByPosition);
    if (singleCallback) {
      singleCallback(pos);
    } else {
      this.pelletConsumers.forEach((callback) => {
        callback(Object.values(pos));
      });
    }
  }

  subscribeToPellets(callback) {
    this.pelletConsumers.push(callback);
    this.updatePelletConsumers({ singleCallback: callback });
  }

  updateScoreConsumers({ singleCallback = null } = {}) {
    const scores = this.playerStates.map((playerState) => ({
      score: playerState.score,
      playerNum: playerState.playerNum,
    }));

    if (singleCallback) {
      singleCallback(scores);
    } else {
      this.scoreConsumers.forEach((callback) => {
        callback(scores);
      });
    }
  }

  subscribeToScores(callback) {
    this.scoreConsumers.push(callback);
    this.updateScoreConsumers({ singleCallback: callback });
  }

  updateTimeConsumers({ singleCallback = null } = {}) {
    if (singleCallback) {
      singleCallback(this.time);
    } else {
      this.timeConsumers.forEach((callback) => {
        callback(this.time);
      });
    }
  }
  subscribeToTime(callback) {
    this.timeConsumers.push(callback);
    this.updateTimeConsumers({ singleCallback: callback });
  }

  addMovement() {
    if (this.slotsToMove < 2) {
      this.slotsToMove += SLOTS_MOVED_PER_MOUTH_MOVE;
    }
  }

  resetState() {
    this.pelletsByPosition = {};
    this.playerStates = [];
    // CR nroyalty: this should be playerNum?
    this.superStatus = { player: null, endSuperAt: null };
    this.numPlayers = null;
    this.satisfiedTutorialDirectiveTime = null;
    this.tutorialState = this._initTutorialState();
    this.time = null;

    this.updateTimeConsumers();
    this.updatePelletConsumers();
    this.updateScoreConsumers();
  }

  updateStatusAndConsumers(status, tag = "no tag provided") {
    const valid = validTransition({ from: this.status, to: status });
    if (!valid) {
      throw new Error(
        `Invalid transition: ${this.status} -> ${status} (${tag})`
      );
    } else {
      console.log(`Transition: ${this.status} -> ${status} (${tag})`);
    }
    this.status = status;
    this._updateStatusConsumers();
  }

  moveToWaitingForPlayerSelect() {
    this.updateStatusAndConsumers(
      WAITING_FOR_PLAYER_SELECT,
      "moveToWaitingForPlayerSelect"
    );
  }

  generatePellets() {
    if (this.numSlots === null) {
      throw new Error("BUG: numSlots is not set.");
    }

    const pelletsByPosition = {};

    if (RANDOM_PELLETS) {
      for (let x = 1; x < this.numSlots.horizontal - 1; x += 1) {
        for (let y = 1; y < this.numSlots.vertical - 1; y += 1) {
          let neighborCount = 0;
          for (let dx = -1; dx <= 1; dx += 2) {
            for (let dy = -1; dy <= 1; dy += 2) {
              if (pelletsByPosition[[x + dx, y + dy]]?.enabled) {
                neighborCount += 1;
              }
            }
          }
          const baseChance = 0.4;
          const chance = baseChance - neighborCount * 0.1;
          const makeIt = Math.random() < chance;
          const delay = Math.random() * 1.75;
          let kind;
          // we always spawn berries at the start
          if (SPAWN_STRAWBERRIES) {
            const forceThisKind = "fruit";
            kind =
              Math.random() < SPECIAL_STARTING_SPAWN_CHANCE
                ? forceThisKind
                : "pellet";
          } else {
            kind = "pellet";
          }
          const p = { x, y, enabled: makeIt, delay, kind: kind };
          pelletsByPosition[[x, y]] = p;
        }
      }
    } else {
      let slotX = 1;
      const pellets = [];
      while (slotX < this.numSlots.horizontal) {
        let slotY = 1;
        while (slotY < this.numSlots.vertical) {
          const delay = Math.random() * 1.75;
          pellets.push({
            x: slotX,
            y: slotY,
            enabled: slotX % 2 === 1 && slotY % 2 === 1,
            delay,
          });
          slotY += 2;
        }
        slotX += 2;
      }
    }
    this.pelletsByPosition = pelletsByPosition;

    this.updatePelletConsumers();
  }

  addIndividualMovement({ currentState, playerNum }) {
    if (currentState.slotsToMove < 2) {
      currentState.slotsToMove += SLOTS_MOVED_PER_MOUTH_MOVE;
    } else {
      console.debug(`DROPPING MOVEMENT FOR ${playerNum}`);
    }
  }

  updateIndividualFaceState({
    playerNum,
    mouthIsOpen,
    jawOpenAmount,
    vertical,
    verticalStrength,
    horizontal,
    horizontalStrength,
    minY,
    maxY,
    minX,
    maxX,
    startTime,
  }) {
    let currentState = this.playerStates[playerNum];
    let direction = currentState.direction;
    let tutorialDirection = "center";
    if (vertical !== "center" && horizontal !== "center") {
      direction = verticalStrength > horizontalStrength ? vertical : horizontal;
      tutorialDirection = direction;
    } else if (horizontal !== "center") {
      direction = horizontal;
      tutorialDirection = direction;
    } else if (vertical !== "center") {
      direction = vertical;
      tutorialDirection = direction;
    }

    currentState.direction = direction;
    currentState.tutorialDirection = tutorialDirection;
    currentState.trackedFaceThisFrame = true;
    currentState.horizontalStrength = horizontalStrength;
    currentState.verticalStrength = verticalStrength;
    if (currentState.mouthIsOpen !== mouthIsOpen) {
      if (this.status === RUNNING_ROUND) {
        this.addIndividualMovement({ playerNum, currentState });
      }
    }
    currentState.mouthIsOpen = mouthIsOpen;

    this.updateRelevantFaceStateConsumers({
      playerNum,
      mouthIsOpen,
      jawOpenAmount,
      direction,
      tutorialDirection,
      minY,
      maxY,
      minX,
      maxX,
    });
  }

  _oldStyleYawPitchCalculation({
    minX,
    minY,
    maxX,
    maxY,
    jawOpenBlend,
    landmarks,
  }) {
    const nose = landmarks[4];
    const height = maxY - minY;
    const width = maxX - minX;
    const noseRelativeHeight = nose.y - minY;
    const noseHeight = noseRelativeHeight / height;
    const noseRelativeWidth = nose.x - minX;
    const noseWidth = noseRelativeWidth / width;
    let horizontal = "center";
    let horizontalStrength = 0;
    if (noseWidth < 0.25) {
      horizontal = "left";
      horizontalStrength = 1 - noseWidth / 0.25;
    } else if (noseWidth > 0.75) {
      horizontal = "right";
      horizontalStrength = (noseWidth - 0.75) / 0.25;
    }
    // If 0.05 > NOSE_BASE_LOOK_UP_THRESHOLD - MINIMUM_NOSE_UPNESS,
    // we could end up with a negative verticalStrength.
    // We purposely use jawOpenBlend instead of min or max here because
    // it's a better proxy for what we're measuring.
    const verticalOffset = (jawOpenBlend / JAW_OPEN_THRESHOLD) * 0.05;
    let vertical = "center";
    let verticalStrength = 0;
    let verticalUpThreshold = NOSE_BASE_LOOK_UP_THRESHOLD - verticalOffset;
    let verticalDownThreshold = NOSE_BASE_LOOK_DOWN_THRSEHOLD - verticalOffset;
    if (noseHeight < verticalUpThreshold) {
      vertical = "up";
      const amountPastThreshold = verticalUpThreshold - noseHeight;
      const thresholdSize = verticalUpThreshold - MINIMUM_NOSE_UPNESS;
      verticalStrength = amountPastThreshold / thresholdSize;
    } else if (noseHeight > verticalDownThreshold) {
      vertical = "down";
      const amountPastThreshold = noseHeight - verticalDownThreshold;
      const thresholdSize = MAXIMUM_NOSE_DOWNNESS - verticalDownThreshold;
      verticalStrength = amountPastThreshold / thresholdSize;
    }
    return { vertical, verticalStrength, horizontal, horizontalStrength };
  }

  processIndividualResult({
    playerNum,
    faceLandmarks,
    faceBlendshapes,
    facialTransformationMatrix,
    startTime,
  }) {
    const landmarks = invertLandmarks(faceLandmarks);
    const minY = Math.min(...landmarks.map((landmark) => landmark.y));
    const maxY = Math.max(...landmarks.map((landmark) => landmark.y));
    const minX = Math.min(...landmarks.map((landmark) => landmark.x));
    const maxX = Math.max(...landmarks.map((landmark) => landmark.x));

    const jawOpenBlend = faceBlendshapes.categories[25].score;
    const topLipCenter = landmarks[12];
    const bottomLipCenter = landmarks[14];
    const jawOpenDiff = (bottomLipCenter.y - topLipCenter.y) * 10;
    const jawOpenMax = Math.max(jawOpenBlend, jawOpenDiff);

    let mouthIsOpen;

    if (this.playerStates[playerNum].mouthIsOpen) {
      mouthIsOpen = jawOpenMax > JAW_CLOSE_THRESHOLD;
    } else {
      mouthIsOpen = jawOpenMax > JAW_OPEN_THRESHOLD;
    }

    const ftm = facialTransformationMatrix.data;

    const [r00, r01, r02, r03] = ftm.slice(0, 4);
    const [r10, r11, r12, r13] = ftm.slice(4, 8);
    const [r20, r21, r22, r23] = ftm.slice(8, 12);
    const [r30, r31, r32, r33] = ftm.slice(12, 16);

    const toDegrees = (x) => x * (180 / Math.PI);
    const pitch = toDegrees(Math.atan2(-r21, Math.sqrt(r20 * r20 + r22 * r22)));
    const yaw = toDegrees(Math.atan2(-r02, r00));

    const pitchThreshold = 10;
    const yawThreshold = 15;
    let vertical = "center";
    let verticalStrength = 0;
    let horizontal = "center";
    let horizontalStrength = 0;
    if (pitch > pitchThreshold) {
      vertical = "down";
      verticalStrength = 1.25 * (pitch - pitchThreshold);
    } else if (pitch < -pitchThreshold) {
      vertical = "up";
      verticalStrength = 1.25 * (-pitch - pitchThreshold);
    }
    if (yaw > yawThreshold) {
      horizontal = "left";
      horizontalStrength = yaw - yawThreshold;
    } else if (yaw < -yawThreshold) {
      horizontal = "right";
      horizontalStrength = -yaw - yawThreshold;
    }

    this.updateIndividualFaceState({
      playerNum,
      mouthIsOpen,
      jawOpenAmount: jawOpenMax,
      vertical,
      verticalStrength,
      horizontal,
      horizontalStrength,
      minY,
      maxY,
      minX,
      maxX,
      startTime,
    });

    this.maybeUpdateDebugState({
      playerNum,
      messages: [
        ["jawOpenBlend", jawOpenBlend],
        ["jawOpenDiff", jawOpenDiff],
        ["jawOpenMax", jawOpenMax],
        ["horizontal", horizontal],
        ["horizontalStrength", horizontalStrength],
        ["vertical", vertical],
        ["verticalStrength", verticalStrength],
      ],
    });
  }

  processAllResults({ results, startTime }) {
    let shouldEarlyReturn = false;
    if (
      !results ||
      !results.faceLandmarks ||
      results.faceLandmarks.length === 0
    ) {
      console.error("NO FACE LANDMARK RESULTS? Bailing.");
      shouldEarlyReturn = true;
    }
    if (
      results.faceLandmarks.length !== this.numPlayers &&
      !this.ignoreMissingFaces
    ) {
      console.error(
        `INCORRECT NUMBER OF FACE LANDMARK RESULTS: ${results.faceLandmarks.length}. Expected num players: ${this.numPlayers} Bailing.`
      );
      shouldEarlyReturn = true;
    }

    if (shouldEarlyReturn) {
      this.playerStates.forEach((playerState) => {
        playerState.trackedFaceThisFrame = false;
      });
      return;
    }

    results.faceLandmarks
      .map((faceLandmarks, index) => {
        const faceBlendshapes = results.faceBlendshapes[index];
        const facialTransformationMatrix =
          results.facialTransformationMatrixes[index];
        const maxX = Math.max(...faceLandmarks.map((landmark) => landmark.x));
        return {
          faceLandmarks,
          faceBlendshapes,
          facialTransformationMatrix,
          maxX,
        };
      })
      .sort((a, b) => b.maxX - a.maxX)
      .forEach(
        (
          { faceLandmarks, faceBlendshapes, facialTransformationMatrix },
          playerNum
        ) => {
          this.processIndividualResult({
            playerNum,
            faceLandmarks,
            faceBlendshapes,
            facialTransformationMatrix,
            startTime,
          });
        }
      );

    if (
      results.faceLandmarks.length < this.numPlayers &&
      this.ignoreMissingFaces
    ) {
      const missingCount = this.numPlayers - results.faceLandmarks.length;
      const faceLandmarks = results.faceLandmarks[0];
      const faceBlendshapes = results.faceBlendshapes[0];
      const facialTransformationMatrix =
        results.facialTransformationMatrixes[0];
      for (let i = 0; i < missingCount; i++) {
        this.processIndividualResult({
          playerNum: results.faceLandmarks.length + i,
          faceLandmarks,
          faceBlendshapes,
          facialTransformationMatrix,
          startTime,
        });
      }
    }
  }

  handleAudio({ isMoving }) {
    if (isMoving) {
      // play audio if it's not playing
      if (this.sounds.chomp.paused) {
        this.sounds.chomp.currentTime = 0;
        this.sounds.chomp.play();
      }
      this.sounds.chomp.loop = true;
    } else {
      // pause audio if it's playing
      this.sounds.chomp.loop = false;
    }
  }

  overlaps({
    playerX,
    playerY,
    candidateX,
    candidateY,
    candidateSize,
    extraCandidateRadius = 0,
  }) {
    playerX = playerX + PLAYER_SIZE_IN_SLOTS / 2;
    playerY = playerY + PLAYER_SIZE_IN_SLOTS / 2;
    candidateX = candidateX + candidateSize / 2;
    candidateY = candidateY + candidateSize / 2;
    const distance = Math.sqrt(
      (playerX - candidateX) ** 2 + (playerY - candidateY) ** 2
    );
    // player size in slots is the *diameter*
    return distance < PLAYER_SIZE_IN_SLOTS / 2 + extraCandidateRadius;
  }

  updatePelletsForPosition({ startTime }) {
    let updated = false;

    this.playerStates.forEach((playerState) => {
      Object.values(this.pelletsByPosition).forEach((pellet) => {
        const overlaps = this.overlaps({
          playerX: playerState.position.x,
          playerY: playerState.position.y,
          candidateX: pellet.x,
          candidateY: pellet.y,
          candidateSize: 1,
          extraCandidateRadius: 0.1,
        });
        const isEaten = this.isEaten({
          playerNum: playerState.playerNum,
          startTime,
        });
        if (!isEaten && overlaps && pellet.enabled) {
          let scoreAmount;
          if (pellet.kind === "fruit") {
            this.sounds.fruit.currentTime = 0;
            this.sounds.fruit.play();
            scoreAmount = STRAWBERRY_POINTS;
          } else if (pellet.kind === "pellet") {
            scoreAmount = 1;
          } else if (pellet.kind === "power-pellet") {
            this.enableSuper({ playerNum: playerState.playerNum });
            scoreAmount = 0;
          } else {
            throw new Error(`Unknown pellet kind: ${pellet.kind}`);
          }
          playerState.score += scoreAmount;
          updated = true;
          pellet.enabled = false;
        }
      });
    });

    if (updated) {
      this.updatePelletConsumers();
      this.updateScoreConsumers();
    }
  }

  handleIndividualMove({
    startTime,
    baseMovement,
    bonusMovement,
    playerState,
  }) {
    const bonusSlotsToConsume = Math.min(
      playerState.slotsToMove,
      bonusMovement
    );

    const isEaten = this.isEaten({
      playerNum: playerState.playerNum,
      startTime,
    });

    if (!isEaten) {
      playerState.slotsToMove -= bonusSlotsToConsume;
      const movementAmount = bonusSlotsToConsume + baseMovement;
      if (playerState.direction === "up") {
        let y = playerState.position.y - movementAmount;
        if (y <= -PLAYER_SIZE_IN_SLOTS) {
          y += this.numSlots.vertical;
        }
        playerState.position.y = y;
      } else if (playerState.direction === "down") {
        let y = playerState.position.y + movementAmount;
        if (y >= this.numSlots.vertical) {
          y -= this.numSlots.vertical;
        }
        playerState.position.y = y;
      } else if (playerState.direction === "left") {
        let x = playerState.position.x - movementAmount;
        if (x <= -PLAYER_SIZE_IN_SLOTS) {
          x += this.numSlots.horizontal;
        }
        playerState.position.x = x;
      } else if (playerState.direction === "right") {
        let x = playerState.position.x + movementAmount;
        if (x >= this.numSlots.horizontal) {
          x -= this.numSlots.horizontal;
        }
        playerState.position.x = x;
      }
    }

    return bonusSlotsToConsume > 0;
  }

  eatPlayer({ startTime, ghostPlayerState }) {
    ghostPlayerState.pacmanState = EATEN;
    ghostPlayerState.eatRecoveryTime = startTime + EAT_RECOVERY_TIME * 1000;
    ghostPlayerState.slotsToMove = 0;

    this.sounds.die.currentTime = 0;
    this.sounds.die.play();

    let dist = -1;
    let slotToMoveTo = null;
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const loc = this.spawnLocation({ playerNum: i });
      const locX = loc.x + PLAYER_SIZE_IN_SLOTS / 2;
      const locY = loc.y + PLAYER_SIZE_IN_SLOTS / 2;
      const x = ghostPlayerState.position.x + PLAYER_SIZE_IN_SLOTS / 2;
      const y = ghostPlayerState.position.y + PLAYER_SIZE_IN_SLOTS / 2;
      const _dist = Math.sqrt((locX - x) ** 2 + (locY - y) ** 2);
      if (_dist > dist) {
        dist = _dist;
        slotToMoveTo = loc;
      }
    }

    ghostPlayerState.forceMove = {
      from: ghostPlayerState.position,
      to: slotToMoveTo,
      startTime: startTime,
      totalTime: EAT_RECOVERY_TIME * 1000,
      endTime: startTime + EAT_RECOVERY_TIME * 1000,
    };

    this.updateRelevantPacmanStateConsumers({
      playerNum: ghostPlayerState.playerNum,
    });
  }

  maybeEatGhosts({ startTime }) {
    const { endSuperAt, playerNum: superPlayerNum } = this.superStatus;
    const isSuperActive = endSuperAt > startTime;
    if (!isSuperActive) {
      return;
    }
    const superActivePlayers = this.playerStates.filter(
      (x) => x.playerNum === superPlayerNum
    );
    const eatableCandidates = this.playerStates.filter((x) => {
      const superNotActive = x.playerNum !== superPlayerNum;
      const notEaten = !this.isEaten({ playerNum: x.playerNum, startTime });
      return superNotActive && notEaten;
    });

    eatableCandidates.forEach((ghostPlayerState) => {
      superActivePlayers.forEach((superPlayerState) => {
        const overlaps = this.overlaps({
          playerX: superPlayerState.position.x,
          playerY: superPlayerState.position.y,
          candidateX: ghostPlayerState.position.x,
          candidateY: ghostPlayerState.position.y,
          candidateSize: PLAYER_SIZE_IN_SLOTS,
          extraCandidateRadius: 0.5,
        });

        if (overlaps || (IMMEDIATELY_EAT && !didImmediatelyEat)) {
          didImmediatelyEat = true;
          console.log(
            `EAT ${superPlayerState.playerNum} => ${ghostPlayerState.playerNum}`
          );
          superPlayerState.score += 5;
          this.eatPlayer({ startTime, ghostPlayerState });
        }
      });
    });
  }

  maybeMove({ startTime, tickTimeMs, baseMovementOverride = 1 }) {
    const secondsOfMovement = tickTimeMs / 1000;
    const baseMovement =
      secondsOfMovement * BASE_SLOTS_MOVED_PER_SECOND * baseMovementOverride;
    const bonusMovement =
      secondsOfMovement * BONUS_SLOTS_MOVED_PER_SECOND_WITH_MOUTH_MOVEMENT;
    let isMoving = false;
    for (let i = 0; i < this.numPlayers; i++) {
      const isSuper =
        this.superIsActive({ startTime }) && this.superStatus.playerNum === i;
      const mult = isSuper ? SPEED_MULTIPLIER_IF_SUPER : 1;
      const didMouthMovement = this.handleIndividualMove({
        startTime,
        baseMovement: baseMovement * mult,
        bonusMovement: bonusMovement * mult,
        playerState: this.playerStates[i],
      });
      isMoving = isMoving || didMouthMovement;
    }

    this.handleAudio({ isMoving });
  }

  maybeForceMove({ startTime }) {
    this.playerStates.forEach((playerState) => {
      const endTime = playerState.forceMove.endTime;
      if (endTime && endTime > startTime) {
        const x = easeOutPow({
          start: playerState.forceMove.from.x,
          end: playerState.forceMove.to.x,
          startTime: playerState.forceMove.startTime,
          currentTime: startTime,
          duration: playerState.forceMove.totalTime,
          pow: 2,
        });
        const y = easeOutPow({
          start: playerState.forceMove.from.y,
          end: playerState.forceMove.to.y,
          startTime: playerState.forceMove.startTime,
          currentTime: startTime,
          duration: playerState.forceMove.totalTime,
          pow: 2,
        });

        playerState.position = { x, y };
      }
    });
  }

  numberOfSpawnedSuperPellets() {
    return Object.values(this.pelletsByPosition).filter(
      (pellet) => pellet.enabled && pellet.kind === "power-pellet"
    ).length;
  }

  superIsActive({ startTime }) {
    return this.superStatus.endSuperAt > startTime;
  }

  maybeSpawnSuperPellets({ spawnX, spawnY, startTime }) {
    const superIsActive = this.superIsActive({ startTime });
    const totalEats = this.playerStates.reduce(
      (acc, playerState) => acc + playerState.score,
      0
    );
    const exceededSuperSpawnThreshold =
      totalEats > this.spawnSupersAfterThisManyEats;

    if (superIsActive) {
      return;
    }
    if (!exceededSuperSpawnThreshold) {
      return;
    }

    const maxSupers = MAX_NUMBER_OF_SUPERS_FOR_NUMBER_OF_PLAYERS({
      numPlayers: this.numPlayers,
    });

    const spawnedSupers = this.numberOfSpawnedSuperPellets();
    if (spawnedSupers >= maxSupers) {
      return;
    }

    let supersToSpawn = maxSupers - spawnedSupers;
    let triesRemaining = 20;
    while (triesRemaining > 0 && supersToSpawn > 0) {
      triesRemaining -= 1;
      const x = spawnX();
      const y = spawnY();
      let overlaps = false;
      this.playerStates.forEach((playerState) => {
        overlaps =
          overlaps ||
          this.overlaps({
            playerX: playerState.position.x,
            playerY: playerState.position.y,
            candidateX: x,
            candidateY: y,
            candidateSize: 1,
            extraCandidateRadius: 0.5,
          });
      });
      if (!overlaps && !this.pelletsByPosition[[x, y]]?.enabled) {
        // maybe add some more jitter here?
        this.pelletsByPosition[[x, y]] = {
          x,
          y,
          enabled: true,
          delay: Math.random() * 0.25,
          kind: "power-pellet",
        };
        supersToSpawn -= 1;
      }
    }
  }

  maybeSpawnMorePellets({ startTime }) {
    const spawnX = () =>
      1 + Math.floor(Math.random() * Math.max(0, this.numSlots.horizontal - 2));
    const spawnY = () =>
      1 + Math.floor(Math.random() * Math.max(0, this.numSlots.vertical - 2));

    this.maybeSpawnSuperPellets({ spawnX, spawnY, startTime });

    const enabledCount = Object.values(this.pelletsByPosition).filter(
      (pellet) => pellet.enabled
    ).length;
    const targetEnabledCount =
      0.35 * this.numSlots.horizontal * this.numSlots.vertical;
    const diff = targetEnabledCount - enabledCount;

    if (diff > targetEnabledCount * 0.5) {
      let maxSpawn = Math.floor(targetEnabledCount * 0.2);
      while (maxSpawn > 0) {
        let x = spawnX();
        let y = spawnY();
        while (this.pelletsByPosition[[x, y]]?.enabled) {
          x = spawnX();
          y = spawnY();
        }
        const enable = Math.random() < 0.5;
        if (enable) {
          const isSpecial = Math.random() < SPECIAL_RESPAWN_CHANCE;
          let kind = "pellet";
          if (isSpecial) {
            const rand = Math.random();
            if (rand < SPECIAL_IS_A_FRUIT_CHANCE) {
              kind = "fruit";
            }
          }
          this.pelletsByPosition[[x, y]].enabled = true;
          this.pelletsByPosition[[x, y]].delay = Math.random() * 0.25;
          this.pelletsByPosition[[x, y]].kind = kind;
        }
        maxSpawn -= 1;
      }
    }
  }

  countDownRound() {
    this.time = SECONDS_IN_ROUND + 1;
    const intervalId = setInterval(() => {
      this.time -= 1;
      if (this.time === 0) {
        clearInterval(intervalId);
        this.time = "FINISH";
        this.updateStatusAndConsumers(COMPLETED_ROUND, "countDownRound");
        setTimeout(() => {
          this.updateStatusAndConsumers(SHOWING_RESULTS, "countDownRound");
        }, 1250);
        this.handleAudio({ isMoving: false });
      }
      this.updateTimeConsumers();
    }, 1000);
  }

  movePlayersToStartingLocation() {
    const startTime = performance.now();
    const totalTime = (COUNT_IN_TIME * 1000) / 1.15;
    const endTime = startTime + totalTime;
    this.playerStates.forEach((playerState) => {
      const to = this.spawnLocation({
        playerNum: playerState.playerNum,
        waiting: false,
      });
      const from = playerState.position;
      playerState.forceMove = { from, to, startTime, totalTime, endTime };
    });
  }

  beginTutorial() {
    this.tutorialState = this._initTutorialState();
    this.updateStatusAndConsumers(RUNNING_TUTORIAL, "beginTutorial");
  }

  endTutorial() {
    this.time = "DONE";
    this.updateTimeConsumers();
    this.setTutorialInstruction(null);
    this.nullOutNumPlayers();
    this.resetState();
    this.moveToWaitingForPlayerSelect();
  }

  handleTutorialStep() {
    // since we're rounding to the nearest 0.5, we use this offset to make sure
    // that we count down for a full second at the first second (and we skip the last
    // 0.5 seconds of our count)
    const OFFSET_FOR_NICER_COUNTING = 0.49;
    const TIME_TO_SATISFY_DIRECTIVE = 4 + OFFSET_FOR_NICER_COUNTING;
    const DIFF_CUTOFF =
      (TIME_TO_SATISFY_DIRECTIVE - OFFSET_FOR_NICER_COUNTING) * 1000;
    const DISPLAYING_DIRECTIVE = "displaying-directive";
    const TOO_FAR_RESET = "too-far-reset";
    // maybe different for vertical?
    const LOOK_THRESHOLD = 25;
    const REQUIRED_ACTION_SATISFACTION_COUNT = 10;

    const playerState = this.playerStates[0];
    const direction = playerState.tutorialDirection;
    const trackedFaceThisFrame = playerState.trackedFaceThisFrame;
    const [directiveDirection, directiveAction] =
      TUTORIAL_DIRECTIVES[this.tutorialState.directiveIndex];

    const computeStrength = () => {
      if (directiveDirection === "left" || directiveDirection === "right") {
        return playerState.horizontalStrength;
      } else if (directiveDirection === "up" || directiveDirection === "down") {
        return playerState.verticalStrength;
      } else {
        console.warn(`BUG: computeStrength called with ${directiveDirection}`);
        return 0;
      }
    };

    const maybePlayErrorSound = () => {
      if (this.sounds.fruit.paused) {
        this.sounds.fruit.currentTime = 0;
        this.sounds.fruit.play();
      }
    };

    const resetDirectiveState = () => {
      this.tutorialState.satisfiedDirectiveTime = null;
      this.tutorialState.actionSatisfactionCount = 0;
      this.tutorialState.lastMouthState = null;
    };

    const retryThisDirective = (state, comment) => {
      resetDirectiveState();
      this.tutorialState.status = state;
      this.time = comment;
      this.updateTimeConsumers();
    };

    const satisfiesDirectiveDirection = () => {
      return direction === directiveDirection;
    };

    const handleWaitAction = () => {
      const countingDown = this.tutorialState.satisfiedDirectiveTime !== null;
      if (!countingDown) {
        this.tutorialState.satisfiedDirectiveTime = performance.now();
        return [TIME_TO_SATISFY_DIRECTIVE.toFixed(0), false];
      }
      const diff =
        performance.now() - this.tutorialState.satisfiedDirectiveTime;
      if (diff > DIFF_CUTOFF) {
        return ["DONE", true];
      } else {
        const ret = (TIME_TO_SATISFY_DIRECTIVE - diff / 1000).toFixed(0);
        return [ret, false];
      }
    };

    const handleMoveOrChompAction = () => {
      const lastState = this.tutorialState.lastMouthState;
      this.tutorialState.lastMouthState = playerState.mouthIsOpen;
      if (lastState === null) {
        this.tutorialState.actionSatisfactionCount = 0;
        return [null, false];
      }
      if (lastState !== playerState.mouthIsOpen) {
        this.tutorialState.actionSatisfactionCount += 1;
        if (directiveAction === "move") {
          this.addIndividualMovement({
            playerNum: 1,
            currentState: playerState,
          });
        }
      }
      if (this.tutorialState.actionSatisfactionCount === 0) {
        return [null, false];
      }
      const complete =
        this.tutorialState.actionSatisfactionCount >=
        REQUIRED_ACTION_SATISFACTION_COUNT;
      const text = playerState.mouthIsOpen ? "open" : "close";
      return [text, complete];
    };

    const satisfiesDirectiveAction = (satisfiesDirection) => {
      if (!satisfiesDirection) {
        return [null, false];
      }
      if (directiveAction === "wait") {
        return handleWaitAction();
      } else if (directiveAction === "chomp" || directiveAction === "move") {
        return handleMoveOrChompAction();
      }
    };

    const faceTrackedThisFrame = trackedFaceThisFrame;

    if (!faceTrackedThisFrame) {
      // reset?
      this.setTutorialInstruction("lost track of face".split(" "));
      retryThisDirective(null, "RETRY");
      return;
    }

    const getInstruction = () => {
      if (directiveAction === "wait") {
        return ["Look", directiveDirection];
      } else if (directiveAction === "chomp") {
        return ["Look", directiveDirection, "and", "chomp"];
      } else if (directiveAction === "move") {
        return ["Look", directiveDirection, "chomp", "and", "move"];
      }
    };

    if (this.tutorialState.status === null) {
      this.tutorialState.status = DISPLAYING_DIRECTIVE;
      this.setTutorialInstruction(getInstruction());
    } else if (this.tutorialState.status === TOO_FAR_RESET) {
      if (direction === "center") {
        this.tutorialState.status = null;
      } else {
        this.setTutorialInstruction("too far - back to center".split(" "));
      }
    } else if (this.tutorialState.status === DISPLAYING_DIRECTIVE) {
      const strength = computeStrength();
      const directionSatisfied = satisfiesDirectiveDirection();
      const [successText, actionSatisfied] =
        satisfiesDirectiveAction(directionSatisfied);
      const tooFar = strength > LOOK_THRESHOLD;
      const inProgress =
        this.tutorialState.satisfiedDirectiveTime !== null ||
        this.tutorialState.actionSatisfactionCount > 0;
      if (tooFar) {
        maybePlayErrorSound();
        retryThisDirective(TOO_FAR_RESET, "RETRY");
      } else if (directionSatisfied && actionSatisfied) {
        this.tutorialState.status = null;
        resetDirectiveState();
        this.tutorialState.directiveIndex += 1;
        if (this.tutorialState.directiveIndex >= TUTORIAL_DIRECTIVES.length) {
          this.endTutorial();
        } else {
          this.time = "GOOD";
          this.updateTimeConsumers();
        }
      } else if (directionSatisfied) {
        this.time = successText;
        this.updateTimeConsumers();
      } else if (this.tutorialState.status === TOO_FAR_RESET) {
        if (direction === "center") {
          this.tutorialState.status = null;
        } else {
          this.time = "too far - back to center";
          this.updateTimeConsumers();
        }
      } else if (inProgress && !directionSatisfied) {
        retryThisDirective(DISPLAYING_DIRECTIVE, "RETRY");
      } else {
        // noop
      }
    }
  }

  countInRound() {
    this.updateStatusAndConsumers(COUNTING_IN_ROUND, "countInRound");
    this.time = "starting";
    this.sounds.start.currentTime = 0;
    this.sounds.start.play();
    this.movePlayersToStartingLocation();

    const intervalId = setInterval(() => {
      if (this.time === "starting") {
        this.generatePellets();
        this.time = COUNT_IN_TIME;
      } else {
        this.time -= 1;
      }
      if (this.time === 0) {
        clearInterval(intervalId);
        this.time = "GO!";
        this.updateTimeConsumers();
        this.updateStatusAndConsumers(RUNNING_ROUND, "countInRound");
        this.countDownRound();
      } else {
        this.updateTimeConsumers();
      }
    }, 1000);
  }

  isEaten({ playerNum, startTime }) {
    return this.playerStates[playerNum].eatRecoveryTime > startTime;
  }

  transitionPacmanStates({ startTime }) {
    const superIsActive = this.superIsActive({ startTime });
    const fadedOrNormal = ({ diff }) => {
      if (diff < 0) {
        console.error(`BUG: fadedOrNormal called when super is not active.`);
      }
      const mod = Math.floor(diff / TIME_TO_TOGGLE_BETWEEN_GHOST_STATES);
      return mod % 2 === 1 ? FADED : GHOST;
    };

    this.playerStates.forEach((playerState) => {
      let targetState = NORMAL;
      const isEaten = this.isEaten({
        playerNum: playerState.playerNum,
        startTime,
      });
      const isSuper = playerState.playerNum === this.superStatus.playerNum;
      if (superIsActive && isSuper) {
        targetState = SUPER;
      } else if (isEaten) {
        targetState = EATEN;
      } else if (superIsActive) {
        const superTime = this.superStatus.endSuperAt;
        if (superTime < startTime) {
          targetState = NORMAL;
          console.error(
            `BUG: superTime < startTime | ${playerState.playerNum}`
          );
        } else {
          const diff = superTime - startTime;
          const inFirstHalf = diff > (DEFAULT_SUPER_DURATION * 1000) / 2;
          targetState = inFirstHalf ? GHOST : fadedOrNormal({ diff });
        }
      }

      if (playerState.pacmanState !== targetState) {
        playerState.pacmanState = targetState;
        this.updateRelevantPacmanStateConsumers({
          playerNum: playerState.playerNum,
        });
      }
    });
  }

  async startGameLoop() {
    this.landmarker = await createFaceLandmarker({ numFaces: this.numPlayers });
    if (this.status === RUNNING_TUTORIAL) {
      // ok
    } else if (this.status !== WAITING_TO_START_ROUND) {
      throw new Error(
        `BUG: startGameLoop called when not waiting for video - ${this.status}`
      );
    }
    let lastVideoTime = -1;
    this.updatePositionConsumers();
    function loop() {
      if (!shouldProcessGameLoop(this.status)) {
        console.log(`bailing from game loop: ${this.status}`);
        return;
      }
      if (this.video.currentTime !== lastVideoTime) {
        const startTime = performance.now();
        const results = this.landmarker.detectForVideo(this.video, startTime);
        this.processAllResults({ results, startTime });
        const tickTimeMs = lastVideoTime === -1 ? 0 : startTime - lastVideoTime;
        if (this.status === RUNNING_TUTORIAL) {
          const shouldMove = this.handleTutorialStep();
          this.maybeMove({ startTime, tickTimeMs, baseMovementOverride: 0 });
        }
        if (this.status === RUNNING_ROUND) {
          this.maybeMove({ startTime, tickTimeMs });
          this.maybeSpawnMorePellets({ startTime });
          this.updatePelletsForPosition({ startTime });
          this.maybeEatGhosts({ startTime });
        }
        this.maybeForceMove({ startTime });
        this.updatePositionConsumers({ startTime });

        // this should live in the game loop when i'm done testing.
        this.transitionPacmanStates({ startTime });
        lastVideoTime = startTime;
      }
      requestAnimationFrame(loop.bind(this));
    }
    requestAnimationFrame(loop.bind(this));
  }
}

export default GameEngine;
