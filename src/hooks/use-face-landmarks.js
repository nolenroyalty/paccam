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

function useFaceLandmarks({ videoEnabled, videoRef, setResults }) {
  const [z, setZ] = React.useState(0);
  const processResults = React.useCallback(
    (results) => {
      if (!results || !results.faceBlendshapes || !results.faceBlendshapes[0]) {
        return;
      }
      const newResults = [];
      const jawOpen = results.faceBlendshapes.categories[25];
      const jawIsOpen = jawOpen.score > 0.6;
      newResults.push({ key: "jawOpen", value: jawIsOpen });
      setResults(newResults);
      if (z < 1) {
        console.log(JSON.stringify(results.faceBlendshapes[0].categories[0]));
        setZ(z + 1);
      }
    },
    [setResults, z]
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
          const results = landmarker.detectForVideo(
            videoRef.current,
            lastVideoTime
          );
          processResults(results);
          lastVideoTime = video.currentTime;
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
