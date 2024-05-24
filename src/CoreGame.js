import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  PLAYER_SIZE_IN_SLOTS,
  SLOTS_MOVED_PER_MOUTH_MOVE,
  SLOTS_MOVED_PER_SECOND,
} from "./constants";
import { range } from "./utils";

const JAW_OPEN_THRESHOLD = 0.48;
const JAW_CLOSE_THRESHOLD = 0.3;
const NOSE_BASE_LOOK_UP_THRESHOLD = 0.42;
const NOSE_BASE_LOOK_DOWN_THRSEHOLD = 0.53;
const SECONDS_IN_ROUND = 30;

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
    this.playerStates = [];
    this.pellets = [];
    this.numSlots = null;
    this.state = "waiting-for-video";
    this.numPlayers = null;
  }

  stopGame() {
    console.log("STOPPING FULL GAME?");
    this.state = "stopped";
  }

  initVideo(video) {
    this.video = video;
  }

  initAudio({ pacmanChomp }) {
    this.pacmanChomp = pacmanChomp;
  }

  initNumSlots(numSlots) {
    this.numSlots = numSlots;
  }

  initNumPlayers(numPlayers) {
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

  updatePelletConsumers() {
    this.pelletConsumers.forEach((callback) => {
      callback(this.pellets);
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

    let slotX = 1;
    const pellets = [];
    while (slotX < this.numSlots.horizontal) {
      let slotY = 1;
      while (slotY < this.numSlots.vertical) {
        const delay = Math.random() * 1.75;
        pellets.push({ x: slotX, y: slotY, enabled: true, delay });
        slotY += 2;
      }
      slotX += 2;
    }

    this.pellets = pellets;
    this.updatePelletConsumers();
  }

  addIndividualMovement({ currentState }) {
    if (currentState.slotsToMove < 2) {
      currentState.slotsToMove += SLOTS_MOVED_PER_MOUTH_MOVE;
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
    if (currentState.jawIsOpen !== jawIsOpen) {
      this.addIndividualMovement({ currentState });
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

    if (this.jawIsOpen) {
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
    if (!results || !results.faceLandmarks) {
      console.error("NO FACE LANDMARK RESULTS? Bailing.");
      return;
    }
    if (results.faceLandmarks.length !== this.numPlayers) {
      console.error(
        `INCORRECT NUMBER OF FACE LANDMARK RESULTS: ${results.faceLandmarks.length}. Expected num players: ${this.numPlayers} Bailing.`
      );
      return;
    }

    // Assume that players are ordered from left to right.
    // (since we invert the webcam, this is right to left)
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

      this.pellets = this.pellets.map((pellet) => {
        const pelletX = pellet.x + 0.5;
        const pelletY = pellet.y + 0.5;

        const distance = Math.sqrt((myX - pelletX) ** 2 + (myY - pelletY) ** 2);
        if (distance < PLAYER_SIZE_IN_SLOTS / 2 && pellet.enabled) {
          playerState.score += 1;
          updated = true;
          return {
            ...pellet,
            enabled: false,
          };
        }
        return pellet;
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
    this.playerStates.forEach((playerState) => {
      isMoving =
        isMoving ||
        this.handleIndividualMove({
          maxSlotsToConsume,
          playerState,
        });
    });

    this.handleAudio({ isMoving });
    if (isMoving) {
      this.updatePelletsForPosition();
      this.updatePositionConsumers();
    }
  }

  countInRound() {
    if (this.state !== "waiting-to-start-round") {
      throw new Error(
        `BUG: startRound called when not waiting to start round. state: ${this.state}`
      );
    }
    this.state = "counting-in-round";
    this.time = "starting";

    const intervalId = setInterval(() => {
      if (this.time === "starting") {
        this.generatePellets();
        this.time = 3;
      } else {
        this.time -= 1;
      }
      this.updateTimeConsumers();
      if (this.time === 0) {
        clearInterval(intervalId);
        this.state = "running-round";
      }
    }, 1000);
  }

  async startGameLoop() {
    this.landmarker = await createFaceLandmarker({ numFaces: this.numPlayers });
    if (this.state !== "waiting-for-video") {
      throw new Error("BUG: startGameLoop called when not waiting for video.");
    }
    this.state = "waiting-to-start-round";
    let lastVideoTime = -1;
    this.updatePositionConsumers();
    console.log("heyo");
    function loop() {
      if (this.state === "stopped") {
        return;
      }
      if (this.video.currentTime !== lastVideoTime) {
        const startTime = performance.now();
        const results = this.landmarker.detectForVideo(this.video, startTime);
        this.processAllResults.bind(this)(results);
        if (this.state === "running-round") {
          const tickTimeMs =
            lastVideoTime === -1 ? 0 : startTime - lastVideoTime;
          this.maybeMove({ tickTimeMs });
        }

        lastVideoTime = startTime;
      }
      requestAnimationFrame(loop.bind(this));
    }
    requestAnimationFrame(loop.bind(this));
  }
}

export default GameEngine;
