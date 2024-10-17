import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import GameEngine from "../../CoreGame";
import StartScreen from "../StartScreen";
import TimerDisplay from "../TimerDisplay";
import TutorialHandler from "../TutorialHandler";
import LiveScoreDisplay from "../LiveScoreDisplay";
import ResultsDisplay from "../ResultsDisplay";
import MissingFacesBanner from "../MissingFacesBanner";
import { WAITING_FOR_VIDEO } from "../../STATUS";
import { COLORS } from "../../COLORS";

const DEBUG = false;

function App() {
  const videoRef = React.useRef();
  const videoActuallyStarted = React.useRef(null);
  const [videoActuallyStartedState, setVideoActuallyStartedState] =
    React.useState(false);
  const [tutorialInstruction, setTutorialInstruction] = React.useState([]);
  const [gameState, setGameState] = React.useState({
    numPlayers: null, // rename to numHumans
    numCPUs: null,
    status: WAITING_FOR_VIDEO,
  });
  const startScreenRef = React.useRef();
  const gameRef = React.useRef(
    new GameEngine({
      setTutorialInstruction,
      videoActuallyStarted,
      status: gameState.status,
      startScreenRef,
    })
  );
  const sounds = React.useRef({});
  const spriteSheets = React.useRef({});
  const [ignoreMissingFaces, setIgnoreMissingFaces] = React.useState(false);

  const [videoEnabled, setVideoEnabled] = React.useState(false);
  const [pacmanResultScreenState, setPacmanResultScreenState] = React.useState(
    {}
  );
  const [scores, setScores] = React.useState({});
  const [debugInfo, setDebugInfo] = React.useState({});

  React.useEffect(() => {
    const promise = new Promise((resolve) => {
      const f = () => {
        console.log("video began");
        resolve();
        setVideoActuallyStartedState(true);
        videoRef.current.onplaying = null;
        const restartIfPaused = () => {
          console.warn(
            "Video paused - this can happen if you take your airpods out! Restarting..."
          );
          setTimeout(() => {
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play();
            }
          }, 0);
        };
        videoRef.current.onpause = restartIfPaused;
      };
      videoRef.current.onplaying = f;
    });
    videoActuallyStarted.current = promise;
  }, []);

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
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        setVideoEnabled(true);
      })
      .catch((err) => {
        console.alert("Error accessing the camera. Refresh?", err);
      });
    gameRef.current.initVideo(videoRef.current);
  }, []);

  const setNumPlayers = React.useCallback(async (numPlayers) => {
    console.log(`SETNUMPLAYERS: ${numPlayers}`);
    await gameRef.current.initNumPlayers(numPlayers);
    setGameState((state) => ({ ...state, numPlayers }));
    gameRef.current.startGameLoop();
  }, []);

  const setNumCPUs = React.useCallback(async (numCPUs) => {
    // await gameRef.current.initNumComputers(numCPUs);
    setGameState((state) => ({ ...state, numCPUs }));
    // gameRef.current.startGameLoop();
  }, []);

  const nullOutNumPlayers = React.useCallback(() => {
    setGameState((state) => ({ ...state, numPlayers: 0, numCPUs: 0 }));
  }, []);

  const beginTutorial = React.useCallback(() => {
    gameRef.current.beginTutorial();
    // HACK
    gameRef.current.nullOutNumPlayers = nullOutNumPlayers;
    setNumPlayers(1);
  }, [nullOutNumPlayers, setNumPlayers]);

  // alt-d to begin tutorial
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyD" && e.altKey) {
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
    game.subscribeToScores(setScores);
    if (DEBUG) {
      const updateDebugInfo = ({ playerNum, debugState }) => {
        setDebugInfo((state) => {
          return { ...state, [playerNum]: debugState };
        });
      };
      game.subscribeToDebugInfo(updateDebugInfo);
    }
  }, []);

  const moveToWaitingForPlayerSelect = React.useCallback(async () => {
    // It'd be nice if we could save state between rounds here. Some problems:
    // 1. we need to await an initNumPlayers call, which is expensive and will
    // block our intro animation
    // 2. for some reason doing the naive thing results in the player's position not
    // being updated??
    // from further looking, the problem is that we haven't re-added the start
    // screen when we call initNumPlayers, so we can't figure out where to put
    // the player faces...
    //
    // we want the following code, but we need a "wait for start screen" line
    // gameRef.current.resetState();
    // await startScreen.loaded(); // this doesn't exist
    // await gameRef.current.initNumPlayers(gameState.numPlayers);
    // gameRef.current.moveToWaitingForPlayerSelect(); // maybe not this
    // gameRef.current.startGameLoop();

    gameRef.current.resetState();
    setGameState((state) => ({ ...state, numPlayers: 0, numCPUs: null }));
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
      <BackgroundGradient />
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
        <VideoFrame
          videoRef={videoRef}
          videoActuallyStartedState={videoActuallyStartedState}
        />
        <StartScreen
          status={gameState.status}
          startGame={startGame}
          numHumans={gameState.numPlayers}
          numCPUs={gameState.numCPUs}
          setNumHumans={setNumPlayers}
          setNumCPUs={setNumCPUs}
          enableVideo={enableVideo}
          videoEnabled={videoEnabled}
          beginTutorial={beginTutorial}
          startScreenRef={startScreenRef}
        />
        <Playfield
          videoRef={videoRef}
          gameRef={gameRef}
          spriteSheets={spriteSheets}
          numPlayers={gameState.numPlayers}
          status={gameState.status}
          addPacmanResultScreenState={addPacmanResultScreenState}
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
      <LiveScoreDisplay
        status={gameState.status}
        numPlayers={gameState.numPlayers}
        scores={scores}
      />
      <ResultsDisplay
        status={gameState.status}
        numPlayers={gameState.numPlayers}
        scores={scores}
        resultScreenState={pacmanResultScreenState}
        moveToWaitingForPlayerSelect={moveToWaitingForPlayerSelect}
      />
      {ignoreMissingFaces && (
        <IgnoreMissingFacesBanner>
          Ignoring missing faces
        </IgnoreMissingFacesBanner>
      )}
      <MissingFacesBanner gameStatus={gameState.status} gameRef={gameRef} />
    </Wrapper>
  );
}

const BackgroundGradient = styled.div`
  position: absolute;
  inset: 0;

  // from https://www.magicpattern.design/tools/css-backgrounds
  background-color: #1c1c5c;
  opacity: 0.9;
  background-image: radial-gradient(#c2be70 0.65px, #1c1c5c 0.65px);
  background-size: 13px 13px;
`;

const Wrapper = styled.div`
  display: grid;
  place-items: center;
  height: 100svh;
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
  color: ${COLORS.white};
  background-color: red;
`;

const GameHolderOverlapping = styled.div`
  position: relative;
  width: 100svw;
  height: 100svh;
  outline: 12px dashed ${COLORS.black};
  border-radius: 4px;
  /* prevent scrollbars... */
  overflow: hidden;
`;

export default App;
