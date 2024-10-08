import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import GameEngine from "../../CoreGame";
import StartScreen from "../StartScreen";
import TimerDisplay from "../TimerDisplay";
import ScoreDisplay from "../ScoreDisplay";
import TutorialHandler from "../TutorialHandler";

const DEBUG = false;

function App() {
  const videoRef = React.useRef();
  const [tutorialInstruction, setTutorialInstruction] = React.useState([]);
  const gameRef = React.useRef(new GameEngine({ setTutorialInstruction }));
  const sounds = React.useRef({});
  const spriteSheets = React.useRef({});
  const [playfieldPadding, setPlayfieldPadding] = React.useState({});
  const [ignoreMissingFaces, setIgnoreMissingFaces] = React.useState(false);

  const [videoEnabled, setVideoEnabled] = React.useState(false);
  const [slotSizePx, setSlotSizePx] = React.useState(null);
  const [pacmanResultScreenState, setPacmanResultScreenState] = React.useState(
    {}
  );

  const [debugInfo, setDebugInfo] = React.useState({});

  React.useEffect(() => {
    if (!gameRef.current) {
      return;
    }
    gameRef.current.setIgnoreMissingFaces(ignoreMissingFaces);
  }, [ignoreMissingFaces]);

  // alt-f to toggle ignore missing results
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyF" && e.altKey) {
        setIgnoreMissingFaces((state) => !state);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const addPacmanResultScreenState = React.useCallback(
    ({ playerNum, position, faceCapture }) => {
      setPacmanResultScreenState((state) => ({
        ...state,
        ["player" + playerNum]: { position, faceCapture },
      }));
    },
    []
  );

  const enableVideo = React.useCallback(() => {
    setVideoEnabled(true);
    gameRef.current.initVideo(videoRef.current);
  }, []);

  const [gameState, setGameState] = React.useState({
    numPlayers: null,
    status: null,
  });

  const setNumPlayers = React.useCallback((numPlayers) => {
    gameRef.current.initNumPlayers(numPlayers);
    setGameState((state) => ({ ...state, numPlayers }));
    gameRef.current.startGameLoop();
  }, []);

  const beginTutorial = React.useCallback(() => {
    gameRef.current.beginTutorial();
    setNumPlayers(1);
  }, [setNumPlayers]);

  // alt-d to begin tutorial
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyD" && e.altKey) {
        console.log("HI");
        beginTutorial();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [beginTutorial]);

  const startGame = React.useCallback(() => {
    setGameState((state) => ({ ...state, running: true }));
    gameRef.current.countInRound();
  }, []);

  React.useEffect(() => {
    const game = gameRef.current;
    game.subscribeToStatus((status) => {
      setGameState((state) => ({ ...state, status }));
    });
    if (DEBUG) {
      const updateDebugInfo = ({ playerNum, debugState }) => {
        setDebugInfo((state) => {
          return { ...state, [playerNum]: debugState };
        });
      };
      game.subscribeToDebugInfo(updateDebugInfo);
    }
  }, []);

  const moveToWaitingForPlayerSelect = React.useCallback(() => {
    gameRef.current.resetState();
    setGameState((state) => ({ ...state, numPlayers: null }));
    gameRef.current.moveToWaitingForPlayerSelect();
  }, []);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }

    const s = sounds.current;
    s.chomp.src = "/sounds/pacman-chomp.mp3";
    s.chomp.volume = 0.2;
    s.fruit.src = "/sounds/pacman-fruit.mp3";
    s.fruit.volume = 0.5;
    s.start.src = "/sounds/pacman-start.mp3";
    s.start.volume = 0.4;
    s.super.src = "/sounds/pacman-super.mp3";
    s.super.volume = 0.2;
    s.die.src = "/sounds/pacman-die.mp3";
    s.die.volume = 0.2;
    gameRef.current.initAudio({ sounds });
  }, [videoEnabled]);

  return (
    <Wrapper>
      <TimerDisplay gameRef={gameRef} />
      <TutorialHandler tutorialInstruction={tutorialInstruction} />
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
      <HiddenImage
        ref={(node) => (spriteSheets.current["green"] = node)}
        src="/aseprite/pacman-green.png"
        alt=""
      />
      <HiddenImage
        ref={(node) => (spriteSheets.current["orange"] = node)}
        src="/aseprite/pacman-orange.png"
        alt=""
      />
      <HiddenImage
        ref={(node) => (spriteSheets.current["ghost"] = node)}
        src="/aseprite/pacman-ghost.png"
        alt=""
      />
      <HiddenImage
        ref={(node) => (spriteSheets.current["super"] = node)}
        src="/aseprite/pacman-super.png"
        alt=""
      />
      <GameHolderOverlapping>
        <VideoFrame videoRef={videoRef} enableVideo={enableVideo} />
        <StartScreen
          status={gameState.status}
          startGame={startGame}
          setNumPlayers={setNumPlayers}
        />
        <Playfield
          playfieldPadding={playfieldPadding}
          setPlayfieldPadding={setPlayfieldPadding}
          videoRef={videoRef}
          gameRef={gameRef}
          spriteSheets={spriteSheets}
          numPlayers={gameState.numPlayers}
          status={gameState.status}
          addPacmanResultScreenState={addPacmanResultScreenState}
          setSlotSizePx={setSlotSizePx}
          debugInfo={debugInfo}
        />
        <audio
          ref={(node) => {
            sounds.current["chomp"] = node;
          }}
        />
        <audio
          ref={(node) => {
            sounds.current["fruit"] = node;
          }}
        />
        <audio
          ref={(node) => {
            sounds.current["start"] = node;
          }}
        />
        <audio
          ref={(node) => {
            sounds.current["super"] = node;
          }}
        />
        <audio
          ref={(node) => {
            sounds.current["die"] = node;
          }}
        />
      </GameHolderOverlapping>
      <ScoreDisplay
        numPlayers={gameState.numPlayers}
        gameRef={gameRef}
        pacmanResultScreenState={pacmanResultScreenState}
        slotSizePx={slotSizePx}
        status={gameState.status}
        moveToWaitingForPlayerSelect={moveToWaitingForPlayerSelect}
      />
      {ignoreMissingFaces && (
        <IgnoreMissingFacesBanner>
          Ignoring missing faces
        </IgnoreMissingFacesBanner>
      )}
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

const IgnoreMissingFacesBanner = styled.h3`
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  background-color: red;
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
  /* prevent scrollbars... */
  overflow: hidden;
`;

export default App;
