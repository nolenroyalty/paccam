import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import GameEngine from "../../CoreGame";

function App() {
  const videoRef = React.useRef();
  const gameRef = React.useRef();
  const pacmanChomp = React.useRef();

  const [videoEnabled, setVideoEnabled] = React.useState(false);

  React.useEffect(() => {
    gameRef.current = new GameEngine();
    gameRef.current.initAudio({ pacmanChomp: pacmanChomp.current });

    return () => {
      // delete gameref current
      delete gameRef.current;
    };
  }, []);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }

    pacmanChomp.current.src = "/pacman-onetime.mp3";
    pacmanChomp.current.volume = 0.2;
  }, [videoEnabled]);

  return (
    <Wrapper>
      <Z>
        <ScoreBanner>Test Text</ScoreBanner>
      </Z>
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

const Z = styled.div`
  height: 60px;
  display: flex;
  justify-content: center;
  margin: 0;
`;

const ScoreBanner = styled.h2`
  color: white;
  margin: 0;
`;

const Wrapper = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 2rem;
`;

const GameHolderOverlapping = styled.div`
  position: relative;
  --max-size: min(92vh, 92vw);
  max-width: var(--max-size);
  max-height: var(--max-size);
  width: 100%;
  aspect-ratio: 1 / 1;
  outline: 4px solid grey;
  border-radius: 4px;
  opacity: 0.7;
`;

export default App;
