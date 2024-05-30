import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  PLAYER_SIZE_IN_SLOTS,
  SLOTS_MOVED_PER_MOUTH_MOVE,
  SLOTS_MOVED_PER_SECOND,
} from "./constants";
import { range } from "./utils";
import {
  WAITING_FOR_VIDEO,
  WAITING_FOR_PLAYER_SELECT,
  WAITING_TO_START_ROUND,
  COUNTING_IN_ROUND,
  RUNNING_ROUND,
  COMPLETED_ROUND,
  SHOWING_RESULTS,
  STOPPED,
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
const JAW_OPEN_THRESHOLD = 0.34;
const JAW_CLOSE_THRESHOLD = 0.125;
const NOSE_BASE_LOOK_UP_THRESHOLD = 0.42;
const NOSE_BASE_LOOK_DOWN_THRSEHOLD = 0.6;
const MINIMUM_NOSE_UPNESS = 0.33;
const MAXIMUM_NOSE_DOWNNESS = 0.73;
const IGNORE_MISSING_RESULTS = true;
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
  constructor() {
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
    this.pelletsByPosition = {};
    this.superStatus = { player: null, endSuperAt: null };
    this.numSlots = null;
    this.status = WAITING_FOR_VIDEO;
    this.numPlayers = null;
    this.time = null;
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

  initVideo(video) {
    this.video = video;
    this.updateStatusAndConsumers(WAITING_FOR_PLAYER_SELECT, "initVideo");

    // enable super on space
    document.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        this.enableSuper = this.enableSuper.bind(this);
        this.enableSuper({ playerNum: 0 });
      }
    });
  }

  initAudio({ sounds }) {
    this.sounds = sounds.current;
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

  spawnLocation({ playerNum }) {
    if (playerNum === 0) {
      return { x: 0, y: 0 };
    } else if (playerNum === 1) {
      return { x: this.numSlots.horizontal - PLAYER_SIZE_IN_SLOTS, y: 0 };
    } else if (playerNum === 2) {
      return { x: 0, y: this.numSlots.vertical - PLAYER_SIZE_IN_SLOTS };
    } else if (playerNum === 3) {
      return {
        x: this.numSlots.horizontal - PLAYER_SIZE_IN_SLOTS,
        y: this.numSlots.vertical - PLAYER_SIZE_IN_SLOTS,
      };
    }
  }

  initNumPlayers(numPlayers) {
    this.updateStatusAndConsumers(WAITING_TO_START_ROUND, "initNumPlayers");
    this.numPlayers = numPlayers;
    this.playerStates = range(numPlayers).map((playerNum) => {
      const { x, y } = this.spawnLocation({ playerNum });
      return {
        position: { x, y },
        direction: "center",
        jawIsOpen: false,
        slotsToMove: 0,
        score: 0,
        playerNum,
        pacmanState: NORMAL,
        eatRecoveryTime: null,
        slotToMoveFrom: null,
        slotToMoveTo: null,
      };
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
      // consumer.id !== id;
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
    jawIsOpen,
    direction,
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
            jawIsOpen,
            direction,
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

  updatePositionConsumers({
    singleCalback = null,
    singlePlayerNum = null,
  } = {}) {
    if (singleCalback && singlePlayerNum !== null) {
      const pos = this.playerStates[singlePlayerNum].position;
      singleCalback(pos);
    } else {
      this.positionConsumers.forEach(({ playerNum, callback }) => {
        const position = this.playerStates[playerNum].position;
        callback(position);
      });
    }
  }

  subscribeToPosition({ playerNum, callback, id }) {
    this.positionConsumers.push({ playerNum, callback, id });
    this.updatePositionConsumers({
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
    this.superStatus = { player: null, endSuperAt: null };
    this.numPlayers = null;
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
    let generatedPelletCount = 0;

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
          if (makeIt) {
            generatedPelletCount += 1;
          }
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
    console.log(`should have made ${generatedPelletCount} pellets`);
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
    jawIsOpen,
    jawOpenAmount,
    vertical,
    verticalStrength,
    horizontal,
    horizontalStrength,
    minY,
    maxY,
    minX,
    maxX,
  }) {
    let currentState = this.playerStates[playerNum];
    let direction = currentState.direction;
    if (vertical !== "center" && horizontal !== "center") {
      direction = verticalStrength > horizontalStrength ? vertical : horizontal;
    } else if (horizontal !== "center") {
      direction = horizontal;
    } else if (vertical !== "center") {
      direction = vertical;
    }
    currentState.direction = direction;
    if (this.status === RUNNING_ROUND && currentState.jawIsOpen !== jawIsOpen) {
      this.addIndividualMovement({ playerNum, currentState });
    }
    currentState.jawIsOpen = jawIsOpen;
    this.updateRelevantFaceStateConsumers({
      playerNum,
      jawIsOpen,
      jawOpenAmount,
      direction,
      minY,
      maxY,
      minX,
      maxX,
    });
  }

  processIndividualResult({ playerNum, faceLandmarks, faceBlendshapes }) {
    const landmarks = invertLandmarks(faceLandmarks);
    const minY = Math.min(...landmarks.map((landmark) => landmark.y));
    const maxY = Math.max(...landmarks.map((landmark) => landmark.y));
    const minX = Math.min(...landmarks.map((landmark) => landmark.x));
    const maxX = Math.max(...landmarks.map((landmark) => landmark.x));

    const nose = landmarks[4];
    const height = maxY - minY;
    const width = maxX - minX;

    const jawOpenBlend = faceBlendshapes.categories[25].score;
    const topLipCenter = landmarks[12];
    const bottomLipCenter = landmarks[14];
    const jawOpenDiff = (bottomLipCenter.y - topLipCenter.y) * 10;
    const jawOpenMax = Math.max(jawOpenBlend, jawOpenDiff);

    let jawIsOpen;

    if (this.playerStates[playerNum].jawIsOpen) {
      jawIsOpen = jawOpenMax > JAW_CLOSE_THRESHOLD;
    } else {
      jawIsOpen = jawOpenMax > JAW_OPEN_THRESHOLD;
    }

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
    this.updateIndividualFaceState({
      playerNum,
      jawIsOpen,
      jawOpenAmount: jawOpenMax,
      vertical,
      verticalStrength,
      horizontal,
      horizontalStrength,
      minY,
      maxY,
      minX,
      maxX,
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
        ["verticalOffset", verticalOffset],
        ["noseHeight", noseHeight],
        ["noseWidth", noseWidth],
      ],
    });
  }

  processAllResults(results) {
    if (
      !results ||
      !results.faceLandmarks ||
      results.faceLandmarks.length === 0
    ) {
      console.error("NO FACE LANDMARK RESULTS? Bailing.");
      return;
    }
    if (
      results.faceLandmarks.length !== this.numPlayers &&
      !IGNORE_MISSING_RESULTS
    ) {
      console.error(
        `INCORRECT NUMBER OF FACE LANDMARK RESULTS: ${results.faceLandmarks.length}. Expected num players: ${this.numPlayers} Bailing.`
      );
      return;
    }

    results.faceLandmarks
      .map((faceLandmarks, index) => {
        const faceBlendshapes = results.faceBlendshapes[index];
        const maxX = Math.max(...faceLandmarks.map((landmark) => landmark.x));
        return { faceLandmarks, faceBlendshapes, maxX };
      })
      .sort((a, b) => b.maxX - a.maxX)
      .forEach(({ faceLandmarks, faceBlendshapes }, playerNum) => {
        this.processIndividualResult({
          playerNum,
          faceLandmarks,
          faceBlendshapes,
        });
      });

    if (
      results.faceLandmarks.length < this.numPlayers &&
      IGNORE_MISSING_RESULTS
    ) {
      const missingCount = this.numPlayers - results.faceLandmarks.length;
      const faceLandmarks = results.faceLandmarks[0];
      const faceBlendshapes = results.faceBlendshapes[0];
      for (let i = 0; i < missingCount; i++) {
        this.processIndividualResult({
          playerNum: results.faceLandmarks.length + i,
          faceLandmarks,
          faceBlendshapes,
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

  handleIndividualMove({ startTime, maxSlotsToConsume, playerState }) {
    const slotsToConsume = Math.min(playerState.slotsToMove, maxSlotsToConsume);
    let isMoving = slotsToConsume > 0;
    const isEaten = this.isEaten({
      playerNum: playerState.playerNum,
      startTime,
    });

    if (isMoving && !isEaten) {
      playerState.slotsToMove -= slotsToConsume;
      const movementAmount = slotsToConsume;
      let hitWall = false;
      if (playerState.direction === "up") {
        const min = 0;
        playerState.position = {
          x: playerState.position.x,
          y: Math.max(playerState.position.y - movementAmount, min),
        };
        hitWall = playerState.position.y === min;
      } else if (playerState.direction === "down") {
        const max = this.numSlots.vertical - PLAYER_SIZE_IN_SLOTS;
        playerState.position = {
          x: playerState.position.x,
          y: Math.min(playerState.position.y + movementAmount, max),
        };
        hitWall = playerState.position.y === max;
      } else if (playerState.direction === "left") {
        const min = 0;
        playerState.position = {
          x: Math.max(playerState.position.x - movementAmount, min),
          y: playerState.position.y,
        };
        hitWall = playerState.position.x === min;
      } else if (playerState.direction === "right") {
        const max = this.numSlots.horizontal - PLAYER_SIZE_IN_SLOTS;
        playerState.position = {
          x: Math.min(playerState.position.x + movementAmount, max),
          y: playerState.position.y,
        };
        hitWall = playerState.position.x === max;
      }
      if (hitWall) {
        playerState.slotsToMove = 0;
      }
    } else if (isEaten) {
      const secondsRemaining = (playerState.eatRecoveryTime - startTime) / 1000;
      const percentRemaining = secondsRemaining / EAT_RECOVERY_TIME;
      const amountEaten = 1 - percentRemaining;
      if (amountEaten > 0) {
        const startX = playerState.slotToMoveFrom.x;
        const startY = playerState.slotToMoveFrom.y;
        const endX = playerState.slotToMoveTo.x;
        const endY = playerState.slotToMoveTo.y;

        const curX = startX + (endX - startX) * amountEaten;
        const curY = startY + (endY - startY) * amountEaten;
        playerState.position = { x: curX, y: curY };
        isMoving = true;
      } else {
        console.error(
          `ERROR: ${playerState.playerNum} is eaten but AMOUNTEATEN not > 0. 
            recoveryTime: ${playerState.eatRecoveryTime},
            startTime: ${startTime},
            amountEaten: ${amountEaten}`
        );
      }
    }
    return isMoving;
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

    ghostPlayerState.slotToMoveFrom = ghostPlayerState.position;
    ghostPlayerState.slotToMoveTo = slotToMoveTo;
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
            `EAT EAT EAT ${superPlayerState.playerNum} => ${ghostPlayerState.playerNum}`
          );
          superPlayerState.score += 5;
          this.eatPlayer({ startTime, ghostPlayerState });
        }
      });
    });
  }

  maybeMove({ startTime, tickTimeMs }) {
    const secondsOfMovement = tickTimeMs / 1000;
    const maxSlotsToConsume = secondsOfMovement * SLOTS_MOVED_PER_SECOND;
    let isMoving = false;
    for (let i = 0; i < this.numPlayers; i++) {
      const isSuper =
        this.superIsActive({ startTime }) && this.superStatus.playerNum === i;
      const mult = isSuper ? SPEED_MULTIPLIER_IF_SUPER : 1;
      const didMove = this.handleIndividualMove({
        startTime,
        maxSlotsToConsume: maxSlotsToConsume * mult,
        playerState: this.playerStates[i],
      });
      isMoving = isMoving || didMove;
    }

    this.handleAudio({ isMoving });
    if (isMoving) {
      this.updatePelletsForPosition({ startTime });
      this.maybeEatGhosts({ startTime });
      this.updatePositionConsumers({ startTime });
    }
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

  countInRound() {
    this.updateStatusAndConsumers(COUNTING_IN_ROUND, "countInRound");
    this.time = "starting";
    this.sounds.start.currentTime = 0;
    this.sounds.start.play();

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
    if (this.status !== WAITING_TO_START_ROUND) {
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
        this.processAllResults.bind(this)(results);
        if (this.status === RUNNING_ROUND) {
          const tickTimeMs =
            lastVideoTime === -1 ? 0 : startTime - lastVideoTime;
          this.maybeMove({ startTime, tickTimeMs });
          this.maybeSpawnMorePellets({ startTime });
        }
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
