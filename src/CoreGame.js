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

async function createFaceLandmarker() {
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
      numFaces: 1,
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
    this.direction = "center";
    this.jawIsOpen = false;
    this.slotsToMove = 0;
    this.position = { x: 3, y: 2 };
    this.pellets = [];
    this.numSlots = null;
    this.stopped = false;
  }

  stop() {
    this.stopped = true;
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

  subscribeToFaceState(callback) {
    this.faceStateConsumers.push(callback);
  }

  subscribeToPosition(callback) {
    this.positionConsumers.push(callback);
  }

  subscribeToPellets(callback) {
    this.pelletConsumers.push(callback);
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

  generatePellets() {
    if (this.numSlots === null) {
      throw new Error("BUG: numSlots is not set.");
    }

    let slotX = 1;
    const pellets = [];
    while (slotX < this.numSlots.horizontal) {
      let slotY = 1;
      while (slotY < this.numSlots.vertical) {
        pellets.push({ x: slotX, y: slotY, enabled: true });
        slotY += 2;
      }
      slotX += 2;
    }

    this.pellets = pellets;
    this.updatePelletConsumers();
  }

  updateFaceState({
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
    let direction = this.direction;
    if (vertical !== "center" && horizontal !== "center") {
      direction = verticalStrength > horizontalStrength ? vertical : horizontal;
    } else if (horizontal !== "center") {
      direction = horizontal;
    } else if (vertical !== "center") {
      direction = vertical;
    }
    this.direction = direction;
    if (this.jawIsOpen !== jawIsOpen) {
      this.addMovement();
    }
    this.jawIsOpen = jawIsOpen;
    this.faceStateConsumers.forEach((callback) => {
      callback({ jawIsOpen, direction, minY, maxY, minX, maxX });
    });
  }

  processResults(results) {
    if (!results || !results.faceLandmarks || !results.faceLandmarks[0]) {
      console.log("no landmarks; bailing");
      return;
    }

    const landmarks = invertLandmarks(results.faceLandmarks[0]);
    const minY = Math.min(...landmarks.map((landmark) => landmark.y));
    const maxY = Math.max(...landmarks.map((landmark) => landmark.y));
    const minX = Math.min(...landmarks.map((landmark) => landmark.x));
    const maxX = Math.max(...landmarks.map((landmark) => landmark.x));

    const nose = landmarks[4];
    const height = maxY - minY;
    const width = maxX - minX;

    const jawOpenAmount = results.faceBlendshapes[0].categories[25].score;
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

    this.updateFaceState({
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

  updateState() {}

  updatePositionConsumers() {
    this.positionConsumers.forEach((callback) => {
      callback(this.position);
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
    const myX = this.position.x + PLAYER_SIZE_IN_SLOTS / 2;
    const myY = this.position.y + PLAYER_SIZE_IN_SLOTS / 2;

    this.pellets = this.pellets.map((pellet) => {
      const pelletX = pellet.x + 0.5;
      const pelletY = pellet.y + 0.5;

      const distance = Math.sqrt((myX - pelletX) ** 2 + (myY - pelletY) ** 2);
      if (distance < PLAYER_SIZE_IN_SLOTS / 2 && pellet.enabled) {
        updated = true;
        return {
          ...pellet,
          enabled: false,
        };
      }
      return pellet;
    });
    if (updated) {
      this.updatePelletConsumers();
    }
  }

  maybeMove({ tickTimeMs }) {
    const secondsOfMovement = tickTimeMs / 1000;
    const maxSlotsToConsume = secondsOfMovement * SLOTS_MOVED_PER_SECOND;
    const slotsToConsume = Math.min(this.slotsToMove, maxSlotsToConsume);

    const isMoving = slotsToConsume > 0;
    this.handleAudio({ isMoving });

    if (isMoving) {
      this.slotsToMove -= slotsToConsume;
      const movementAmount = slotsToConsume;
      let hitWall = false;
      if (this.direction === "up") {
        const min = 0;
        this.position = {
          x: this.position.x,
          y: Math.max(this.position.y - movementAmount, min),
        };
        hitWall = this.position.y === min;
      } else if (this.direction === "down") {
        const max = this.numSlots.vertical - PLAYER_SIZE_IN_SLOTS;
        this.position = {
          x: this.position.x,
          y: Math.min(this.position.y + movementAmount, max),
        };
        hitWall = this.position.y === max;
      } else if (this.direction === "left") {
        const min = 0;
        this.position = {
          x: Math.max(this.position.x - movementAmount, min),
          y: this.position.y,
        };
        hitWall = this.position.x === min;
      } else if (this.direction === "right") {
        const max = this.numSlots.horizontal - PLAYER_SIZE_IN_SLOTS;
        this.position = {
          x: Math.min(this.position.x + movementAmount, max),
          y: this.position.y,
        };
        hitWall = this.position.x === max;
      }
      if (hitWall) {
        this.slotsToMove = 0;
      }
      this.updatePelletsForPosition();
      this.updatePositionConsumers();
    }
  }

  async start() {
    this.landmarker = await createFaceLandmarker();
    let lastVideoTime = -1;
    function loop() {
      if (this.stopped) {
        return;
      }
      if (this.video.currentTime !== lastVideoTime) {
        const startTime = performance.now();
        const results = this.landmarker.detectForVideo(this.video, startTime);
        this.processResults(results);
        const tickTimeMs = lastVideoTime === -1 ? 0 : startTime - lastVideoTime;
        this.maybeMove({ tickTimeMs });
        lastVideoTime = startTime;
      }
      requestAnimationFrame(loop.bind(this));
    }
    requestAnimationFrame(loop.bind(this));
  }
}

export default GameEngine;
