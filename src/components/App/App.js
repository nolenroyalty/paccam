import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";

function App() {
  const videoRef = React.useRef();
  const gameRef = React.useRef();
  const [videoEnabled, setVideoEnabled] = React.useState(false);

  return (
    <Wrapper>
      <GameHolderOverlapping>
        <VideoFrame
          videoRef={videoRef}
          gameRef={gameRef}
          setVideoEnabled={setVideoEnabled}
        />
        <Playfield
          videoRef={videoRef}
          videoEnabled={videoEnabled}
          gameRef={gameRef}
        />
      </GameHolderOverlapping>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
`;

const GameHolderOverlapping = styled.div`
  position: relative;
  --max-size: min(90vh, 90vw);
  max-width: var(--max-size);
  max-height: var(--max-size);
  width: 100%;
  aspect-ratio: 1 / 1;
  outline: 4px solid grey;
  border-radius: 4px;
`;

export default App;
