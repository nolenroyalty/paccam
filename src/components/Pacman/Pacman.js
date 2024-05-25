import React from "react";
import styled, { keyframes } from "styled-components";
import { PLAYER_SIZE_PERCENT } from "../../constants";
import { zIndex1 } from "../../zindex";
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
  ghostSpriteSheet,
  addPacmanResultScreenState,
}) {
  const canvasRef = React.useRef();
  const myRef = React.useRef();
  const [coords, setCoords] = React.useState(null);
  const [direction, setDirection] = React.useState("center");
  const [mouthState, setMouthState] = React.useState("closed");
  const [ghostState, setGhostState] = React.useState({
    state: "normal",
    eatenAmount: 0,
  });
  const [maxJawState, setMaxJawState] = React.useState(0);
  const [videoCoordinates, setVideoCoordinates] = React.useState(null);

  React.useEffect(() => {
    const updateFaceState = ({
      jawIsOpen,
      jawOpenAmount,
      direction,
      minY,
      maxY,
      minX,
      maxX,
    }) => {
      setDirection(direction);
      setMouthState(jawIsOpen ? "open" : "closed");
      setVideoCoordinates({ minY, maxY, minX, maxX });
      setMaxJawState((prev) => Math.max(prev, jawOpenAmount));
    };

    if (!gameRef.current) {
      throw new Error("BUG: gameRef.current is not set.");
    }

    gameRef.current.subscribeToFaceState({
      callback: updateFaceState,
      playerNum,
    });
    gameRef.current.subscribeToPosition({ callback: setCoords, playerNum });
    gameRef.current.subscribeToGhostState({
      callback: setGhostState,
      playerNum,
    });
  }, [gameRef, playerNum]);

  const drawCurrentSprite = React.useCallback(
    ({ outline, ctx, spriteX, ghost }) => {
      const sheet = ghost ? ghostSpriteSheet : spriteSheet;
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
    [ghostSpriteSheet, spriteSheet]
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
    ({ ctx, spriteX, videoCoordinates, ghost }) => {
      ctx.save();
      ctx.clearRect(0, 0, PLAYER_CANVAS_SIZE, PLAYER_CANVAS_SIZE);
      ctx.imageSmoothingEnabled = false;
      drawCurrentSprite({ outline: false, ctx, spriteX, ghost });

      if (videoCoordinates) {
        drawVideoSnapshot({ ctx, videoCoordinates });
        ctx.globalCompositeOperation = "overlay";
        drawCurrentSprite({ spriteX, ctx, outline: false, ghost });
      }

      ctx.globalCompositeOperation = "source-over";
      // Make sure we draw this regardless of whether we have
      // video coordinates.
      drawCurrentSprite({ spriteX, ctx, outline: true });
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
    const ghost = ghostState.state === "ghost";

    drawPlayerToCanvas({ ctx, spriteX, videoCoordinates, ghost });
    ctx.restore();
  }, [
    coords,
    direction,
    drawPlayerToCanvas,
    mouthState,
    spriteSheet,
    videoCoordinates,
    videoRef,
    ghostState,
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
    drawPlayerToCanvas({ ctx, spriteX: 0, videoCoordinates });
    const faceCapture = tempCanvas.toDataURL("image/png");
    addPacmanResultScreenState({ playerNum, faceCapture });
    largestMouthSaved.current = maxJawState;

    console.log(`SCREENSHOTTED PLAYER ${playerNum}: ${maxJawState}`);
  }, [
    addPacmanResultScreenState,
    drawPlayerToCanvas,
    maxJawState,
    playerNum,
    videoCoordinates,
  ]);

  return coords ? (
    <Player
      ref={myRef}
      data-player={`player-${playerNum}`}
      style={{
        "--left": `${(coords.x / numSlots.horizontal) * 100}%`,
        "--top": `${(coords.y / numSlots.vertical) * 100}%`,
        "--grayscale":
          ghostState.eatenAmount === 0
            ? null
            : Math.floor(ghostState.eatenAmount * 1000) / 10 + "%",
        "--brightness":
          ghostState.eatenAmount === 0
            ? null
            : Math.floor(4 * ghostState.eatenAmount * 100) / 100,
      }}
    >
      <InteriorCanvas
        ref={canvasRef}
        width={PLAYER_CANVAS_SIZE}
        height={PLAYER_CANVAS_SIZE}
      />
    </Player>
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

const Player = styled.div`
  position: absolute;
  z-index: ${zIndex1};
  width: ${PLAYER_SIZE_PERCENT}%;
  aspect-ratio: 1/1;
  left: var(--left);
  top: var(--top);
  animation: ${fadeIn} 0.5s forwards;
  filter: grayscale(var(--grayscale)) brightness(var(--brightness));
`;

const InteriorCanvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

export default React.memo(Pacman);
