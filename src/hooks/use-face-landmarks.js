import React from "react";
import {
  FaceLandmarker,
  FaceDetector,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

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

/* we need to do some weighted moving average clever thing to smooth things out,
   and prevent flipping between states. Should also recalculate expetected nose position
   based on jaw open state, since the nose's position changes relative to the size of the head
   regardless of whether the jaw is actually marked "open". 
   
   
   maybe it'd be easier to reference nose position relative to some other landmarks?
   
*/

function useFaceLandmarks({
  videoEnabled,
  videoRef,
  setResults,
  turnUp,
  turnDown,
  turnLeft,
  turnRight,
  openMouth,
  closeMouth,
  setVideoCoordinates,
}) {
  const [z, setZ] = React.useState(0);
  const processResults = React.useCallback(
    (results) => {
      if (!results || !results.faceBlendshapes || !results.faceBlendshapes[0]) {
        return;
      }
      const newResults = [];
      const jawOpen = results.faceBlendshapes[0].categories[25];
      const jawIsOpen = jawOpen.score > 0.45;

      if (jawIsOpen) {
        openMouth();
      } else {
        closeMouth();
      }
      newResults.push({ key: "jawOpen", value: String(jawIsOpen) });

      const landmarks = results.faceLandmarks[0].map((landmark) => ({
        x: 1 - landmark.x,
        y: landmark.y,
      }));

      const minY = Math.min(...landmarks.map((landmark) => landmark.y));
      const maxY = Math.max(...landmarks.map((landmark) => landmark.y));
      const minX = Math.min(...landmarks.map((landmark) => landmark.x));
      const maxX = Math.max(...landmarks.map((landmark) => landmark.x));

      setVideoCoordinates({ minX, minY, maxX, maxY });

      const nose = landmarks[4];

      const height = maxY - minY;
      const width = maxX - minX;

      const noseRelativeHeight = nose.y - minY;
      const noseHeight = noseRelativeHeight / height;

      const noseRelativeWidth = nose.x - minX;
      const noseWidth = noseRelativeWidth / width;

      let noseHorizontalState = "middle";
      if (noseWidth < 0.25) {
        noseHorizontalState = "left";
        turnLeft();
      } else if (noseWidth > 0.75) {
        noseHorizontalState = "right";
        turnRight();
      }
      newResults.push({
        key: "noseHorizontalState",
        value: noseHorizontalState,
      });

      let noseVerticalState = "middle";
      if (
        (!jawIsOpen && noseHeight < 0.44) ||
        (jawIsOpen && noseHeight < 0.35)
      ) {
        noseVerticalState = "up";
        turnUp();
      } else if (
        (!jawIsOpen && noseHeight > 0.53) ||
        (jawIsOpen && noseHeight > 0.49)
      ) {
        noseVerticalState = "down";
        turnDown();
      }

      newResults.push({ key: "noseVerticalState", value: noseVerticalState });

      setResults(newResults);
      if (z < 1) {
        console.log(JSON.stringify(results.faceBlendshapes[0].categories[0]));
        setZ(z + 1);
      }
    },
    [
      closeMouth,
      openMouth,
      setResults,
      turnDown,
      turnLeft,
      turnRight,
      turnUp,
      z,
    ]
  );

  React.useEffect(() => {
    console.log("run effect");
    if (!videoEnabled) return;
    let animationFrameId;

    async function setup() {
      const landmarker = await createFaceLandmarker();
      let lastVideoTime = -1;

      function loop() {
        const video = videoRef.current;
        if (video.currentTime !== lastVideoTime) {
          const startTime = performance.now();
          const results = landmarker.detectForVideo(
            videoRef.current,
            startTime
          );
          processResults(results);
          lastVideoTime = startTime;
        }
        animationFrameId = requestAnimationFrame(loop);
      }

      animationFrameId = requestAnimationFrame(loop);
    }
    setup();
    return () => {
      if (animationFrameId) {
        console.log("canceling animation frame");
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [processResults, videoEnabled, videoRef]);
}

export default useFaceLandmarks;
