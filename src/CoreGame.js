import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const JAW_OPEN_THRESHOLD = 0.56;
const JAW_CLOSE_THRESHOLD = 0.03;
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
  constructor(video) {
    console.log(video);
    this.video = video;
    this.updateWithFaceState = [];
    this.direction = "center";
    this.jawIsOpen = false;
  }

  subscribeToFaceState(callback) {
    this.updateWithFaceState.push(callback);
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
    this.updateWithFaceState.forEach((callback) => {
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

    // nroyalty: SOON - take this into account when calculating nose vertical position
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

  async start() {
    this.landmarker = await createFaceLandmarker();
    let lastVideoTime = -1;
    function loop() {
      if (this.video.currentTime !== lastVideoTime) {
        const startTime = performance.now();
        const results = this.landmarker.detectForVideo(this.video, startTime);
        this.processResults(results);
        lastVideoTime = startTime;
      }
      requestAnimationFrame(loop.bind(this));
    }
    requestAnimationFrame(loop.bind(this));
  }
}

export default GameEngine;
