import React from "react";
import styled, { keyframes } from "styled-components";
import { PLAYER_SIZE_IN_SLOTS } from "../../constants";
import { zIndex1 } from "../../zindex";
import { EATEN, GHOST, NORMAL, FADED, SUPER } from "../../PACMANSTATE";
import { RUNNING_TUTORIAL } from "../../STATUS";
import { COLORS } from "../../COLORS";
import { GIF_STUFF } from "../../constants";
const PLAYER_CANVAS_SIZE = 128;
const SPRITE_WIDTH = 32;
const SPRITE_HEIGHT = 32;

const isSafari = () => {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
};

function Pacman({
  gameRef,
  videoRef,
  spriteSheet,
  slotSizePx,
  playerNum,
  status,
  ghostSpriteSheet,
  superSpriteSheet,
  addPacmanFaceGifFrame,
  initializePacmanFaceGif,
  isHuman,
  debugInfo,
}) {
  const canvasRef = React.useRef();
  const myRef = React.useRef();
  const [coords, setCoords] = React.useState(null);
  const [displayDupe, setDisplayDupe] = React.useState(false);
  const [dupePositions, setDupePositions] = React.useState(null);
  const dupeRef = React.useRef([]);
  const [direction, setDirection] = React.useState("center");
  const [mouthState, setMouthState] = React.useState("closed");
  const [pacmanSpriteState, setPacmanSpriteState] = React.useState(NORMAL);
  const [maxJawState, setMaxJawState] = React.useState(0);
  const [videoCoordinates, setVideoCoordinates] = React.useState(null);
  const id = React.useId();
  React.useEffect(() => {
    const updateFaceState = ({
      mouthIsOpen,
      jawOpenAmount,
      direction,
      tutorialDirection,
      minY,
      maxY,
      minX,
      maxX,
    }) => {
      if (status === RUNNING_TUTORIAL) {
        setDirection(tutorialDirection);
      } else {
        setDirection(direction);
      }
      setMouthState(mouthIsOpen ? "open" : "closed");
      if (isHuman) {
        setVideoCoordinates({ minY, maxY, minX, maxX });
        setMaxJawState((prev) => Math.max(prev, jawOpenAmount));
      }
    };

    if (!gameRef.current) {
      throw new Error("BUG: gameRef.current is not set.");
    }

    const game = gameRef.current;

    game.subscribeToFaceState({
      callback: updateFaceState,
      playerNum,
      id,
    });
    game.subscribeToPosition({
      callback: ({ position, duped }) => {
        setCoords(position);
        setDupePositions(duped);
        const didDupe =
          Object.values(duped).find((d) => d !== null) !== undefined;
        if (didDupe) {
          setDisplayDupe(true);
          Object.entries(duped).forEach(([key, pos]) => {
            if (pos === null) {
              dupeRef.current[key] = null;
            }
          });
        } else {
          setDisplayDupe(false);
          dupeRef.current = [];
        }
      },
      playerNum,
      id,
    });
    game.subscribeToPacmanState({
      callback: setPacmanSpriteState,
      playerNum,
      id,
    });

    return () => {
      game.unsubscribeFromFaceState({ playerNum, id });
      game.unsubscribeFromPosition({ playerNum, id });
      game.unsubscribeFromPacmanState({ playerNum, id });
    };
  }, [gameRef, id, isHuman, playerNum, status]);

  const drawCurrentSprite = React.useCallback(
    ({ outline, ctx, spriteX, spriteKind }) => {
      let sheet;
      if (spriteKind === SUPER) {
        sheet = superSpriteSheet;
      } else if (spriteKind === GHOST) {
        sheet = ghostSpriteSheet;
      } else if (spriteKind === FADED) {
        sheet = spriteSheet;
      } else if (spriteKind === NORMAL) {
        sheet = spriteSheet;
      } else if (spriteKind === EATEN) {
        sheet = spriteSheet;
      } else {
        throw new Error(`Unknown pacman state: ${spriteKind}`);
      }
      const spriteY = outline ? 32 : 0;
      ctx.drawImage(
        sheet,
        spriteX,
        spriteY,
        SPRITE_WIDTH,
        SPRITE_HEIGHT,
        0,
        0,
        PLAYER_CANVAS_SIZE,
        PLAYER_CANVAS_SIZE
      );
    },
    [ghostSpriteSheet, spriteSheet, superSpriteSheet]
  );

  const drawVideoSnapshot = React.useCallback(
    ({ ctx, videoCoordinates }) => {
      ctx.globalCompositeOperation = "source-atop";
      let { minX, minY, maxX, maxY } = videoCoordinates;
      const tempMaxX = 1 - minX;
      minX = 1 - maxX;
      maxX = tempMaxX;

      const height = maxY - minY;
      minY -= height * 0.05;
      maxY += height * 0.1;
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      ctx.scale(-1, 1);
      ctx.translate(-PLAYER_CANVAS_SIZE, 0);
      const sx = minX * videoWidth;
      const sy = minY * videoHeight;
      const sWidth = (maxX - minX) * videoWidth;
      const sHeight = (maxY - minY) * videoHeight;

      ctx.drawImage(
        videoRef.current,
        sx,
        sy,
        sWidth,
        sHeight,
        0,
        0,
        PLAYER_CANVAS_SIZE,
        PLAYER_CANVAS_SIZE
      );
      ctx.resetTransform();
    },
    [videoRef]
  );

  const drawPlayerToCanvas = React.useCallback(
    ({ ctx, spriteX, videoCoordinates, spriteKind, spriteAlpha }) => {
      ctx.save();
      ctx.clearRect(0, 0, PLAYER_CANVAS_SIZE, PLAYER_CANVAS_SIZE);
      ctx.imageSmoothingEnabled = false;
      drawCurrentSprite({ outline: false, ctx, spriteX, spriteKind });

      if (videoCoordinates && isHuman) {
        drawVideoSnapshot({ ctx, videoCoordinates });
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = spriteAlpha;
        drawCurrentSprite({ spriteX, ctx, outline: false, spriteKind });
      }
      // WORK AROUND A STUPID SAFARI BUG
      // For a reason I don't understand, source-atop doesn't work when drawing our video
      // snapshot; we draw a rect instead of a circle. But we can re-crop it here.
      // only do this on safari...
      ctx.globalAlpha = 1;
      if (isSafari()) {
        ctx.globalCompositeOperation = "destination-in";
        drawCurrentSprite({ spriteX, ctx, outline: false, spriteKind });
      }

      ctx.globalCompositeOperation = "source-over";
      // Make sure we draw this regardless of whether we have
      // video coordinates.
      drawCurrentSprite({ spriteX, ctx, outline: true, spriteKind });
      ctx.restore();
    },
    [drawCurrentSprite, drawVideoSnapshot, isHuman]
  );

  const captureCurrentPlayerFace = React.useCallback(
    ({ videoCoordinates, includeBackgroundlessImage }) => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = PLAYER_CANVAS_SIZE;
      tempCanvas.height = PLAYER_CANVAS_SIZE;
      const ctx = tempCanvas.getContext("2d");
      drawPlayerToCanvas({
        ctx,
        spriteX: 0,
        videoCoordinates,
        spriteAlpha: 1,
        spriteKind: NORMAL,
      });
      let pngToDisplayBeforeGifIsReady;
      if (includeBackgroundlessImage) {
        pngToDisplayBeforeGifIsReady = tempCanvas.toDataURL("image/png");
      }
      // So gif.js can handle transparency but the way that it does it is a little funny.
      // we need to provide a color that it recognizes as transparent; it doesn't respect
      // the alpha channel (I guess this is a gif limitation? like it can't figure it out because
      // gifs just have a color marked as alpha?)
      // So we draw a green rectangle behind the player and then we can tell gif.js to treat
      // that color as transparent.
      //
      // Relatedly, we want a properly transparent png to display before we've created our gif.
      // So we create that on demand just for the face frame that we're building the gif around.
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#00FF00";
      ctx.fillRect(0, 0, PLAYER_CANVAS_SIZE, PLAYER_CANVAS_SIZE);
      const withBackground = tempCanvas.toDataURL("image/png");
      return { withBackground, pngToDisplayBeforeGifIsReady };
    },
    [drawPlayerToCanvas]
  );

  React.useEffect(() => {
    if (!coords) {
      return;
    }
    const ctx = canvasRef.current.getContext("2d");
    ctx.save();

    let xIdx = 0;
    if (mouthState === "open") {
      xIdx += 5; // 5 states - 1 for center, 4 for directions
    }
    if (direction === "right") {
      xIdx += 1;
    } else if (direction === "down") {
      xIdx += 2;
    } else if (direction === "left") {
      xIdx += 3;
    } else if (direction === "up") {
      xIdx += 4;
    }

    const spriteX = xIdx * 32;
    let spriteAlpha = 1;
    if (pacmanSpriteState === GHOST) {
      spriteAlpha = 0.8;
    } else if (pacmanSpriteState === FADED) {
      spriteAlpha = 0.5;
    }

    drawPlayerToCanvas({
      ctx,
      spriteX,
      videoCoordinates,
      spriteAlpha,
      spriteKind: pacmanSpriteState,
    });

    if (displayDupe) {
      Object.values(dupeRef.current).forEach((ref) => {
        if (ref !== null) {
          const dupeCtx = ref.getContext("2d");
          dupeCtx.save();
          dupeCtx.clearRect(0, 0, PLAYER_CANVAS_SIZE, PLAYER_CANVAS_SIZE);
          drawPlayerToCanvas({
            ctx: dupeCtx,
            spriteX,
            videoCoordinates,
            spriteAlpha,
            spriteKind: pacmanSpriteState,
          });
          dupeCtx.restore();
        }
      });
    }

    ctx.restore();
  }, [
    coords,
    direction,
    drawPlayerToCanvas,
    mouthState,
    pacmanSpriteState,
    spriteSheet,
    videoCoordinates,
    videoRef,
    displayDupe,
  ]);

  // We always save a few frames of mouth movement so that we can build a gif
  // that leads into the "funny" moment we want our gifs to freeze on.
  const lastFewMouthStates = React.useRef([]);
  const lastSavedTime = React.useRef(0);
  const numberOfMouthStatesToAddToCurrentLoop = React.useRef(0);
  React.useEffect(() => {
    if (!isHuman) {
      return;
    }

    const now = performance.now();
    if (now - lastSavedTime.current > GIF_STUFF.mouthSaveFrequency) {
      const { withBackground } = captureCurrentPlayerFace({ videoCoordinates });
      lastFewMouthStates.current = [
        ...lastFewMouthStates.current.slice(-GIF_STUFF.priorMouthFramesToSave),
        withBackground,
      ];
      // optionally, we save a few frames "after" so that the gif can keep going
      // in practice i think this is probably worse, not sure yet.
      if (numberOfMouthStatesToAddToCurrentLoop.current > 0) {
        numberOfMouthStatesToAddToCurrentLoop.current--;
        addPacmanFaceGifFrame({ playerNum, frame: withBackground });
      }
      lastSavedTime.current = now;
    }
  }, [
    addPacmanFaceGifFrame,
    captureCurrentPlayerFace,
    drawPlayerToCanvas,
    isHuman,
    playerNum,
    videoCoordinates,
  ]);

  // good proxy for "funniest image" is "the time you opened your mouth the most"
  const largestMouthSaved = React.useRef(-1);
  React.useEffect(() => {
    if (maxJawState <= largestMouthSaved.current) {
      return;
    }

    const lastFew = lastFewMouthStates.current;

    const { withBackground, pngToDisplayBeforeGifIsReady } =
      captureCurrentPlayerFace({
        videoCoordinates,
        includeBackgroundlessImage: true,
      });

    initializePacmanFaceGif({
      playerNum,
      mainMouthFrame: withBackground,
      framesBeforeMain: lastFew,
      pngToDisplayBeforeGifIsReady,
    });
    numberOfMouthStatesToAddToCurrentLoop.current =
      GIF_STUFF.subsequentMouthFramesToSave;
    largestMouthSaved.current = maxJawState;
  }, [
    captureCurrentPlayerFace,
    drawPlayerToCanvas,
    initializePacmanFaceGif,
    maxJawState,
    playerNum,
    videoCoordinates,
  ]);

  const savedBotState = React.useRef(false);
  React.useEffect(() => {
    if (isHuman) {
      // if we don't clear state here, we can run into a bug where we show a human
      // face for a bot (because we don't re-take our picture of the bot when
      // swapping between humans and bots repeatedly)
      savedBotState.current = false;
      return;
    } else if (savedBotState.current) {
      return;
    }
    savedBotState.current = true;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = PLAYER_CANVAS_SIZE;
    tempCanvas.height = PLAYER_CANVAS_SIZE;
    const ctx = tempCanvas.getContext("2d");
    const hardcodedRightOpen = 6;
    drawPlayerToCanvas({
      ctx,
      spriteX: hardcodedRightOpen * 32,
      videoCoordinates,
      spriteAlpha: 1,
      spriteKind: NORMAL,
    });
    const faceCapture = tempCanvas.toDataURL("image/png");
    initializePacmanFaceGif({
      playerNum,
      pngToDisplayBeforeGifIsReady: faceCapture,
      mainMouthFrame: faceCapture,
      framesBeforeMain: [],
    });
  }, [
    drawPlayerToCanvas,
    initializePacmanFaceGif,
    isHuman,
    playerNum,
    videoCoordinates,
  ]);

  const grayScale = pacmanSpriteState === EATEN ? 1 : null;
  const widthPx = slotSizePx * PLAYER_SIZE_IN_SLOTS;
  const opacity = pacmanSpriteState === GHOST && !isHuman ? 0.9 : 1;

  return coords ? (
    <>
      <Player
        ref={myRef}
        data-player={`player-${playerNum}`}
        style={{
          "--left": `${coords.x * slotSizePx}px`,
          "--top": `${coords.y * slotSizePx}px`,
          "--width": `${widthPx}px`,
          "--grayscale": grayScale,
          "--pacman-x": coords.x,
          "--pacman-y": coords.y,
          "--opacity": opacity,
        }}
      >
        <InteriorCanvas
          ref={canvasRef}
          width={PLAYER_CANVAS_SIZE}
          height={PLAYER_CANVAS_SIZE}
        />
        {debugInfo?.length > 0 ? (
          <DebugWrapper>
            {debugInfo.map((info, idx) => (
              <DebugLabel key={idx}>{info}</DebugLabel>
            ))}
          </DebugWrapper>
        ) : null}
      </Player>
      {displayDupe &&
        Object.entries(dupePositions).map(([key, pos], idx) => {
          if (pos === null) {
            return null;
          }

          return (
            <PlayerBase
              key={key}
              style={{
                "--left": `${pos.x * slotSizePx}px`,
                "--top": `${pos.y * slotSizePx}px`,
                "--grayscale": grayScale,
                "--width": `${widthPx}px`,
                "--pacman-x": pos.x,
                "--pacman-y": pos.y,
                "--opacity": opacity,
              }}
            >
              <InteriorCanvas
                ref={(el) => (dupeRef.current[idx] = el)}
                width={PLAYER_CANVAS_SIZE}
                height={PLAYER_CANVAS_SIZE}
              />
            </PlayerBase>
          );
        })}
    </>
  ) : null;
}

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const DebugWrapper = styled.div`
  position: relative;
  z-index: ${zIndex1};
  bottom: 0;
  left: 0;
  transform: translate(5%, 5%);
  width: max-content;
  background-color: #ffffff80;
  font-size: 1rem;
`;

const DebugLabel = styled.p`
  display: block;
  color: ${COLORS.black};
  font-size: 1.25rem;
`;

const PlayerBase = styled.div`
  position: absolute;
  z-index: ${zIndex1};
  width: var(--width);
  aspect-ratio: 1/1;
  left: 0;
  top: 0;
  transform: translate(var(--left), var(--top));
  filter: grayscale(var(--grayscale));
  opacity: var(--opacity);
`;

const Player = styled(PlayerBase)`
  animation: ${fadeIn} 0.5s forwards;
`;

const InteriorCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  opacity: var(--opacity);
`;

export default React.memo(Pacman);
