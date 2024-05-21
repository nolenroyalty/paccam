import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import useFaceLandmarks from "../../hooks/use-face-landmarks";
import ResultsDisplay from "../ResultsDisplay/ResultsDisplay";

function faceReducer(state, action) {
  if (action === "look-right" && state.direction !== "right") {
    return { ...state, direction: "right" };
  } else if (action === "look-left" && state.direction !== "left") {
    return { ...state, direction: "left" };
  } else if (action === "look-up" && state.direction !== "up") {
    return { ...state, direction: "up" };
  } else if (action === "look-down" && state.direction !== "down") {
    return { ...state, direction: "down" };
  } else if (action === "open-mouth" && !state.mouthOpen) {
    return {
      ...state,
      mouthOpen: true,
      consumedMouthClosed: true,
      consumedMouthOpen: false,
    };
  } else if (action === "close-mouth" && state.mouthOpen) {
    return {
      ...state,
      mouthOpen: false,
      consumedMouthOpen: true,
      consumedMouthClosed: false,
    };
  } else if (action === "consume-mouth-open" && !state.consumedMouthOpen) {
    return { ...state, consumedMouthOpen: true };
  } else if (action === "consume-mouth-closed" && !state.consumedMouthClosed) {
    return { ...state, consumedMouthClosed: true };
  }
  return state;
}

function App() {
  const videoRef = React.useRef();
  const [videoEnabled, setVideoEnabled] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [faceState, dispatchFaceAction] = React.useReducer(faceReducer, {
    horizontal: "center",
    vertical: "center",
    mouthOpen: false,
    consumedMouthOpen: false,
    consumedMouthClosed: false,
  });

  const turnUp = React.useCallback(() => {
    dispatchFaceAction("look-up");
  }, [dispatchFaceAction]);

  const turnDown = React.useCallback(() => {
    dispatchFaceAction("look-down");
  }, [dispatchFaceAction]);

  const turnLeft = React.useCallback(() => {
    dispatchFaceAction("look-left");
  }, [dispatchFaceAction]);

  const turnRight = React.useCallback(() => {
    dispatchFaceAction("look-right");
  }, [dispatchFaceAction]);

  const openMouth = React.useCallback(() => {
    dispatchFaceAction("open-mouth");
  }, [dispatchFaceAction]);

  const closeMouth = React.useCallback(() => {
    dispatchFaceAction("close-mouth");
  }, [dispatchFaceAction]);

  const consumeMouthOpen = React.useCallback(() => {
    dispatchFaceAction("consume-mouth-open");
  }, [dispatchFaceAction]);

  const consumeMouthClosed = React.useCallback(() => {
    dispatchFaceAction("consume-mouth-closed");
  }, [dispatchFaceAction]);

  useFaceLandmarks({
    videoRef,
    videoEnabled,
    setResults,
    turnUp,
    turnDown,
    turnLeft,
    turnRight,
    openMouth,
    closeMouth,
  });

  return (
    <GameHolder>
      <ResultsDisplay results={results} />
      <Header />
      <One>
        <VideoFrame setVideoEnabled={setVideoEnabled} videoRef={videoRef} />
      </One>
      <Two>
        <Playfield
          faceState={faceState}
          videoEnabled={videoEnabled}
          consumeMouthClosed={consumeMouthClosed}
          consumeMouthOpen={consumeMouthOpen}
          results={results}
        />
      </Two>
    </GameHolder>
  );
}

const GameHolder = styled.div`
  display: grid;
  position: relative;
  grid-template-areas:
    "header"
    "videoframe"
    "playfield";
  grid-template-rows: auto 1fr 1fr;
  width: 100vw;
  height: 100vh;
  gap: 10px;
  align-content: space-between;
  padding-bottom: 10px;

  --max-size: min(calc(50vh - 40px), calc(100vw - 25px));
`;

const Header = styled.div`
  grid-area: header;
  background-color: #d3d3d366;
  opacity: 0;
  height: 50px;
`;

const FittedSquare = styled.div`
  aspect-ratio: 1 / 1;
  max-width: var(--max-size);
  max-height: var(--max-size);
  width: 100%;
  height: 100%;
  justify-self: center;
  border-radius: 8px;
`;

const One = styled(FittedSquare)`
  grid-area: videoframe;
  background-color: lightblue;
`;

const Two = styled(FittedSquare)`
  grid-area: playfield;
  background-color: slategrey;
`;

export default App;
