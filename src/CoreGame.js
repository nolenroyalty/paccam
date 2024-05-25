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

// this is normally 0.48
const JAW_OPEN_THRESHOLD = 0.35;
const JAW_CLOSE_THRESHOLD = 0.25;
const NOSE_BASE_LOOK_UP_THRESHOLD = 0.42;
const NOSE_BASE_LOOK_DOWN_THRSEHOLD = 0.53;
const SECONDS_IN_ROUND = 30;
const COUNT_IN_TIME = 4;
const IGNORE_MISSING_RESULTS = true;
const RANDOM_PELLETS = true;

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
    this.playerStates = [];
    this.pelletsByPosition = {};
    this.numSlots = null;
    this.status = WAITING_FOR_VIDEO;
    this.numPlayers = null;
  }

  stopGame() {
    console.log("STOPPING FULL GAME?");
    this.updateStatusAndConsumers(STOPPED, "stopGame");
  }

  initVideo(video) {
    this.video = video;
    this.updateStatusAndConsumers(WAITING_FOR_PLAYER_SELECT, "initVideo");
  }

  initAudio({ pacmanChomp }) {
    this.pacmanChomp = pacmanChomp;
  }

  initNumSlots(numSlots) {
    this.numSlots = numSlots;
  }

  initNumPlayers(numPlayers) {
    this.updateStatusAndConsumers(WAITING_TO_START_ROUND, "initNumPlayers");
    this.numPlayers = numPlayers;
    this.playerStates = range(numPlayers).map((playerNum) => {
      let x, y;
      if (playerNum === 0) {
        x = 0;
        y = 0;
      } else if (playerNum === 1) {
        x = this.numSlots.horizontal - PLAYER_SIZE_IN_SLOTS;
        y = 0;
      } else if (playerNum === 2) {
        x = 0;
        y = this.numSlots.vertical - PLAYER_SIZE_IN_SLOTS;
      } else if (playerNum === 3) {
        x = this.numSlots.horizontal - PLAYER_SIZE_IN_SLOTS;
        y = this.numSlots.vertical - PLAYER_SIZE_IN_SLOTS;
      }
      return {
        position: { x, y },
        direction: "center",
        jawIsOpen: false,
        slotsToMove: 0,
        score: 0,
        playerNum,
      };
    });
  }

  _updateStatusConsumers() {
    this.statusConsumers.forEach((callback) => {
      callback(this.status);
    });
  }

  subscribeToStatus(callback) {
    this.statusConsumers.push(callback);
    this._updateStatusConsumers();
  }

  subscribeToFaceState({ playerNum, callback }) {
    this.faceStateConsumers.push({ playerNum, callback });
  }

  subscribeToPosition({ playerNum, callback }) {
    this.positionConsumers.push({ playerNum, callback });
  }

  subscribeToPellets(callback) {
    this.pelletConsumers.push(callback);
  }

  subscribeToScores(callback) {
    this.scoreConsumers.push(callback);
  }

  subscribeToTime(callback) {
    this.timeConsumers.push(callback);
  }

  addMovement() {
    if (this.slotsToMove < 2) {
      this.slotsToMove += SLOTS_MOVED_PER_MOUTH_MOVE;
    }
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

  updatePelletConsumers() {
    this.pelletConsumers.forEach((callback) => {
      callback(Object.values(this.pelletsByPosition));
    });
  }

  updateScoreConsumers() {
    const scores = this.playerStates.map((playerState) => ({
      score: playerState.score,
      playerNum: playerState.playerNum,
    }));

    this.scoreConsumers.forEach((callback) => {
      callback(scores);
    });
  }

  updateTimeConsumers() {
    this.timeConsumers.forEach((callback) => {
      callback(this.time);
    });
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
          const p = { x, y, enabled: makeIt, delay };
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
    console.log(JSON.stringify(pelletsByPosition));
    this.pelletsByPosition = pelletsByPosition;

    this.updatePelletConsumers();
  }

  addIndividualMovement({ currentState, playerNum }) {
    if (currentState.slotsToMove < 2) {
      currentState.slotsToMove += SLOTS_MOVED_PER_MOUTH_MOVE;
    } else {
      console.log(`DROPPING MOVEMENT FOR ${playerNum}`);
    }
  }

  updateIndividualFaceState({
    playerNum,
    jawIsOpen,
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
    this.faceStateConsumers.forEach(
      ({ playerNum: consumerPlayerNum, callback }) => {
        if (playerNum === consumerPlayerNum) {
          callback({ jawIsOpen, direction, minY, maxY, minX, maxX });
        }
      }
    );
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

    const jawOpenAmount = faceBlendshapes.categories[25].score;
    let jawIsOpen;

    if (this.playerStates[playerNum].jawIsOpen) {
      jawIsOpen = jawOpenAmount > JAW_CLOSE_THRESHOLD;
    } else {
      jawIsOpen = jawOpenAmount > JAW_OPEN_THRESHOLD;
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

    const verticalOffset = (jawOpenAmount / JAW_OPEN_THRESHOLD) * 0.05;

    let vertical = "center";
    let verticalStrength = 0;
    let verticalUpThreshold = NOSE_BASE_LOOK_UP_THRESHOLD - verticalOffset;
    let verticalDownThreshold = NOSE_BASE_LOOK_DOWN_THRSEHOLD + verticalOffset;
    if (noseHeight < verticalUpThreshold) {
      vertical = "up";
      verticalStrength = 1 - noseHeight / verticalUpThreshold;
    } else if (noseHeight > verticalDownThreshold) {
      vertical = "down";
      verticalStrength =
        (noseHeight - verticalDownThreshold) / (1 - verticalDownThreshold);
    }
    this.updateIndividualFaceState({
      playerNum,
      jawIsOpen,
      vertical,
      verticalStrength,
      horizontal,
      horizontalStrength,
      minY,
      maxY,
      minX,
      maxX,
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

  updatePositionConsumers() {
    this.positionConsumers.forEach(({ playerNum, callback }) => {
      const position = this.playerStates[playerNum].position;
      callback(position);
    });
  }

  handleAudio({ isMoving }) {
    if (isMoving) {
      // play audio if it's not playing
      if (this.pacmanChomp.paused) {
        this.pacmanChomp.currentTime = 0;
        this.pacmanChomp.play();
      }
      this.pacmanChomp.loop = true;
    } else {
      // pause audio if it's playing
      this.pacmanChomp.loop = false;
    }
  }

  updatePelletsForPosition() {
    let updated = false;

    this.playerStates.forEach((playerState) => {
      const myX = playerState.position.x + PLAYER_SIZE_IN_SLOTS / 2;
      const myY = playerState.position.y + PLAYER_SIZE_IN_SLOTS / 2;

      Object.values(this.pelletsByPosition).forEach((pellet) => {
        const pelletX = pellet.x + 0.5;
        const pelletY = pellet.y + 0.5;

        const distance = Math.sqrt((myX - pelletX) ** 2 + (myY - pelletY) ** 2);
        if (distance < PLAYER_SIZE_IN_SLOTS / 2 && pellet.enabled) {
          playerState.score += 1;
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

  handleIndividualMove({ maxSlotsToConsume, playerState }) {
    const slotsToConsume = Math.min(playerState.slotsToMove, maxSlotsToConsume);
    const isMoving = slotsToConsume > 0;

    if (isMoving) {
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
    }
    return isMoving;
  }

  maybeMove({ tickTimeMs }) {
    const secondsOfMovement = tickTimeMs / 1000;
    const maxSlotsToConsume = secondsOfMovement * SLOTS_MOVED_PER_SECOND;
    let isMoving = false;
    for (let i = 0; i < this.numPlayers; i++) {
      const didMove = this.handleIndividualMove({
        maxSlotsToConsume,
        playerState: this.playerStates[i],
      });
      isMoving = isMoving || didMove;
    }

    this.handleAudio({ isMoving });
    if (isMoving) {
      this.updatePelletsForPosition();
      this.updatePositionConsumers();
    }
  }

  maybeSpawnMorePellets() {
    const enabledCount = Object.values(this.pelletsByPosition).filter(
      (pellet) => pellet.enabled
    ).length;
    const targetEnabledCount =
      0.35 * this.numSlots.horizontal * this.numSlots.vertical;
    const diff = targetEnabledCount - enabledCount;

    const spawnX = () =>
      1 + Math.floor(Math.random() * this.numSlots.horizontal - 2);
    const spawnY = () =>
      1 + Math.floor(Math.random() * this.numSlots.vertical - 2);

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
          this.pelletsByPosition[[x, y]] = { x, y, enabled: true };
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
          this.maybeMove({ tickTimeMs });
          this.maybeSpawnMorePellets();
        }

        lastVideoTime = startTime;
      }
      requestAnimationFrame(loop.bind(this));
    }
    requestAnimationFrame(loop.bind(this));
  }
}

export default GameEngine;
