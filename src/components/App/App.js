import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import GameEngine from "../../CoreGame";

function App() {
  const videoRef = React.useRef();
  const gameRef = React.useRef(new GameEngine());
  const pacmanChomp = React.useRef();

  const [videoEnabled, setVideoEnabled] = React.useState(false);

  React.useEffect(() => {
    gameRef.current.initAudio({ pacmanChomp: pacmanChomp.current });
  }, []);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }

    pacmanChomp.current.src = "/pacman-onetime.mp3";
    pacmanChomp.current.volume = 0.3;
  }, [videoEnabled]);

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
        <audio ref={pacmanChomp} src="/pacman-onetime.mp3" />
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
