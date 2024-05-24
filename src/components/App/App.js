import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import GameEngine from "../../CoreGame";
import StartScreen from "../StartScreen";
import TimerDisplay from "../TimerDisplay";

function App() {
  const videoRef = React.useRef();
  const gameRef = React.useRef(new GameEngine());
  const pacmanChomp = React.useRef();
  const spriteSheets = React.useRef({});

  const [videoEnabled, setVideoEnabled] = React.useState(false);

  const enableVideo = React.useCallback(() => {
    // There's a bug here if we actually ever stop the game.
    setVideoEnabled(true);
    gameRef.current.initVideo(videoRef.current);
  }, []);

  const [gameState, setGameState] = React.useState({
    numPlayers: null,
    scores: [0, 0, 0, 0],
    running: false,
  });

  const setNumPlayers = React.useCallback((numPlayers) => {
    setGameState((state) => ({ ...state, numPlayers }));
    gameRef.current.initNumPlayers(numPlayers);
    gameRef.current.startGameLoop();
  }, []);

  const startGame = React.useCallback(() => {
    setGameState((state) => ({ ...state, running: true }));
    // can we make this wait for video to load?
    gameRef.current.countInRound();
  }, []);

  React.useEffect(() => {
    const game = gameRef.current;
    game.initAudio({ pacmanChomp: pacmanChomp.current });
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
      <TimerDisplay gameRef={gameRef} />
      <HiddenImage
        ref={(node) => (spriteSheets.current["yellow"] = node)}
        src="/aseprite/pacman-yellow.png"
        alt=""
      />
      <HiddenImage
        ref={(node) => (spriteSheets.current["pink"] = node)}
        src="/aseprite/pacman-pink.png"
        alt=""
      />
      <GameHolderOverlapping>
        <VideoFrame videoRef={videoRef} enableVideo={enableVideo} />
        {videoEnabled ? (
          <StartScreen
            gameState={gameState}
            startGame={startGame}
            setNumPlayers={setNumPlayers}
          />
        ) : null}
        <Playfield
          videoRef={videoRef}
          videoEnabled={videoEnabled}
          gameRef={gameRef}
          spriteSheets={spriteSheets}
          numPlayers={gameState.numPlayers}
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
