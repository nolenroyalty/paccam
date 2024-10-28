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
    numHumans: 0,
    numBots: 0,
    status: WAITING_FOR_VIDEO,
  });
  const [landmarkerLoading, setLandmarkerLoading] = React.useState(false);
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
  const startingAnimationCompletePromiseRef = React.useRef(null);
  const spriteSheets = React.useRef({});
  const [ignoreMissingFaces, setIgnoreMissingFaces] = React.useState(false);

  const [videoEnabled, setVideoEnabled] = React.useState(false);
  const [pacmanResultScreenState, setPacmanResultScreenState] = React.useState(
    {}
  );
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

  const setNumPlayers = React.useCallback(
    async ({ numHumans, numBots, setStartingLocations = true }) => {
      console.log(`SETNUMPLAYERS: ${numHumans} | ${numBots}`);
      const patch = {};
      let _numHumans = gameState.numHumans;
      let _numBots = gameState.numBots;
      if (numBots !== null) {
        patch.numBots = numBots;
        _numBots = numBots;
      }
      if (numHumans !== null) {
        patch.numHumans = numHumans;
        _numHumans = numHumans;
      }
      await gameRef.current.initNumPlayers({
        numHumans: _numHumans,
        numBots: _numBots,
        setStartingLocations,
      });
      setGameState((state) => ({
        ...state,
        ...patch,
      }));
      gameRef.current.startGameLoop();
    },
    [gameState.numBots, gameState.numHumans]
  );

  const startGame = React.useCallback(() => {
    setGameState((state) => ({ ...state, running: true }));
    gameRef.current.countInRound();
  }, []);

  React.useEffect(() => {
    const game = gameRef.current;
    game.subscribeToStatus((status) => {
      setGameState((state) => ({ ...state, status }));
    });
    game.subscribeToLandmarkerLoading({
      callback: setLandmarkerLoading,
      id: "MAIN-APP",
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

  const moveToWaitingForPlayerSelect = React.useCallback(
    async (
      { forceNumHumans = null, forceNumBots = null } = {
        forceNumHumans: null,
        forceNumBots: null,
      }
    ) => {
      // We do some gross stuff here.
      // Basically: we want to reset the game state, avoid re-initializing the landmarker
      // (since it's blocking and takes a while), and avoid displaying the players
      // until the start screen animation has completed.
      //
      // The worst part of this is probably the need to call setStartingLocations
      // separately from setNumPlayers; setNumPlayers used to set the starting
      // location of the players, but we make that configurable now.
      const numHumans =
        forceNumHumans === null ? gameState.numHumans : forceNumHumans;
      const numBots = forceNumBots === null ? gameState.numBots : forceNumBots;
      console.log(`FORCE: ${forceNumHumans} | ${forceNumBots}`);
      console.log(`moveToWaitingForPlayerSelect: ${numHumans} | ${numBots}`);
      gameRef.current.resetState();
      gameRef.current.moveToWaitingForPlayerSelect();
      await setNumPlayers({
        numHumans,
        numBots,
        setStartingLocations: false,
      });

      if (startingAnimationCompletePromiseRef.current) {
        console.log("waiting for animation to complete...");
        const promise = startingAnimationCompletePromiseRef.current;
        await promise;
        console.log("animation complete!");
      }

      // we compute the waiting location based on the location of the start
      // screen, so we need to wait for that animation to complete before fading
      // in the players! kinda gross.
      gameRef.current.setStartingLocations();
    },
    [gameState.numBots, gameState.numHumans, setNumPlayers]
  );

  const beginTutorial = React.useCallback(async () => {
    // HACK: we do this to avoid a circular dependency.
    // we also have to specify forceNumHumans because [endTutorialHack]
    // is set before we re-define [moveToWaitingForPlayerSelect] with
    // an updated number of players lol
    const endTutorialHack = () => {
      moveToWaitingForPlayerSelect({
        forceNumHumans: 1,
      });
    };
    gameRef.current.endTutorialHack = endTutorialHack;
    await setNumPlayers({ numHumans: 1, numBots: 0 });
    gameRef.current.beginTutorial();
  }, [moveToWaitingForPlayerSelect, setNumPlayers]);

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

  const totalPlayers = gameState.numHumans + gameState.numBots;

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
          numHumans={gameState.numHumans}
          numBots={gameState.numBots}
          setNumPlayers={setNumPlayers}
          enableVideo={enableVideo}
          videoEnabled={videoEnabled}
          beginTutorial={beginTutorial}
          startScreenRef={startScreenRef}
          landmarkerLoading={landmarkerLoading}
          startingAnimationCompletePromiseRef={
            startingAnimationCompletePromiseRef
          }
        />
        <Playfield
          videoRef={videoRef}
          gameRef={gameRef}
          spriteSheets={spriteSheets}
          totalPlayers={totalPlayers}
          numHumans={gameState.numHumans}
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
        <MissingFacesBanner gameStatus={gameState.status} gameRef={gameRef} />
      </GameHolderOverlapping>
      <LiveScoreDisplay
        status={gameState.status}
        totalPlayers={totalPlayers}
        gameRef={gameRef}
      />
      <ResultsDisplay
        status={gameState.status}
        totalPlayers={totalPlayers}
        gameRef={gameRef}
        resultScreenState={pacmanResultScreenState}
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

const BackgroundGradient = styled.div`
  position: absolute;
  inset: 0;

  // from https://www.magicpattern.design/tools/css-backgrounds
  background-color: #1c1c5c;
  opacity: 0.9;
  background-image: radial-gradient(#c2be70 0.65px, #1c1c5c 0.65px);
  background-size: 13px 13px;
  z-index: -2;
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
  z-index: 1;
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
