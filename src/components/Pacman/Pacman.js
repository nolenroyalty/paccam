import React from "react";
import styled, { keyframes } from "styled-components";
import { PLAYER_SIZE_PERCENT } from "../../constants";
import { zIndex1 } from "../../zindex";
import { EATEN, GHOST, NORMAL, FADED, SUPER } from "../../PACMANSTATE";
import { RUNNING_TUTORIAL } from "../../STATUS";
const PLAYER_CANVAS_SIZE = 128;
const SPRITE_WIDTH = 32;
const SPRITE_HEIGHT = 32;

function Pacman({
  gameRef,
  videoRef,
  spriteSheet,
  numSlots,
  playerNum,
  status,
  padding,
  ghostSpriteSheet,
  superSpriteSheet,
  addPacmanResultScreenState,
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
      setVideoCoordinates({ minY, maxY, minX, maxX });
      setMaxJawState((prev) => Math.max(prev, jawOpenAmount));
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
  }, [gameRef, id, playerNum, status]);

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

      if (videoCoordinates) {
        drawVideoSnapshot({ ctx, videoCoordinates });
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = spriteAlpha;
        drawCurrentSprite({ spriteX, ctx, outline: false, spriteKind });
      }
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = "source-over";
      // Make sure we draw this regardless of whether we have
      // video coordinates.
      drawCurrentSprite({ spriteX, ctx, outline: true, spriteKind });
      ctx.restore();
    },
    [drawCurrentSprite, drawVideoSnapshot]
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

  // good proxy for "funniest image" is "the time you opened your mouth the most"
  const largestMouthSaved = React.useRef(-1);
  React.useEffect(() => {
    if (maxJawState <= largestMouthSaved.current) {
      return;
    }

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
    const faceCapture = tempCanvas.toDataURL("image/png");
    addPacmanResultScreenState({ playerNum, faceCapture });
    largestMouthSaved.current = maxJawState;

    console.debug(`SCREENSHOTTED PLAYER ${playerNum}: ${maxJawState}`);
  }, [
    addPacmanResultScreenState,
    drawPlayerToCanvas,
    maxJawState,
    playerNum,
    videoCoordinates,
  ]);

  const grayScale = pacmanSpriteState === EATEN ? 1 : null;

  return coords ? (
    <>
      <Player
        ref={myRef}
        data-player={`player-${playerNum}`}
        style={{
          "--left": `${(coords.x / numSlots.horizontal) * 100}%`,
          "--top": `${(coords.y / numSlots.vertical) * 100}%`,
          "--padding-left": `${padding.left}px`,
          "--padding-top": `${padding.top}px`,
          "--grayscale": grayScale,
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
                "--left": `${(pos.x / numSlots.horizontal) * 100}%`,
                "--top": `${(pos.y / numSlots.vertical) * 100}%`,
                "--grayscale": grayScale,
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
  color: black;
  font-size: 1.25rem;
`;

const PlayerBase = styled.div`
  position: absolute;
  z-index: ${zIndex1};
  width: ${PLAYER_SIZE_PERCENT}%;
  aspect-ratio: 1/1;
  left: var(--left);
  top: var(--top);
  filter: grayscale(var(--grayscale));
`;

const Player = styled(PlayerBase)`
  animation: ${fadeIn} 0.5s forwards;
`;

const InteriorCanvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

export default React.memo(Pacman);
