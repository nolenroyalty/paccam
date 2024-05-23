import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import GameEngine from "../../CoreGame";

function App() {
  const videoRef = React.useRef();
  const gameRef = React.useRef(new GameEngine());
  const pacmanChomp = React.useRef();
  const pacmanYellow = React.useRef();
  const pacmanPink = React.useRef();

  const [videoEnabled, setVideoEnabled] = React.useState(false);

  React.useEffect(() => {
    const game = gameRef.current;
    game.initAudio({ pacmanChomp: pacmanChomp.current });

    return () => {
      game.stop();
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
      <HiddenImage
        ref={pacmanYellow}
        src="/aseprite/pacman-yellow.png"
        alt=""
      />
      <HiddenImage ref={pacmanPink} src="/aseprite/pacman-pink.png" alt="" />
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
          pacmanYellow={pacmanYellow}
          pacmanPink={pacmanPink}
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
  font-size: 2rem;
`;

const HiddenImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  pointer-events: none;
  width: 0px;
  height: 0px;
`;

const GameHolderOverlapping = styled.div`
  position: relative;
  --max-size: min(95vh, 95vw);
  /* max-width: var(--max-size); */
  /* max-height: var(--max-size); */
  /* width: 100%; */
  width: 100vw;
  height: 100vh;
  /* aspect-ratio: 1 / 1; */
  outline: 12px dashed black;
  border-radius: 4px;
`;

export default App;
