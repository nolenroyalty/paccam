import React from "react";
import styled, { keyframes } from "styled-components";
import { PLAYER_SIZE_PERCENT } from "../../constants";
import { COMPLETED_ROUND, SHOWING_RESULTS } from "../../STATUS";
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
  addPacmanResultScreenState,
}) {
  const canvasRef = React.useRef();
  const myRef = React.useRef();
  const [coords, setCoords] = React.useState(null);
  const [direction, setDirection] = React.useState("center");
  const [mouthState, setMouthState] = React.useState("closed");
  const [videoCoordinates, setVideoCoordinates] = React.useState(null);

  React.useEffect(() => {
    const updateFaceState = ({
      jawIsOpen,
      direction,
      minY,
      maxY,
      minX,
      maxX,
    }) => {
      setDirection(direction);
      setMouthState(jawIsOpen ? "open" : "closed");
      setVideoCoordinates({ minY, maxY, minX, maxX });
    };

    if (!gameRef.current) {
      throw new Error("BUG: gameRef.current is not set.");
    }

    gameRef.current.subscribeToFaceState({
      callback: updateFaceState,
      playerNum,
    });
    gameRef.current.subscribeToPosition({ callback: setCoords, playerNum });
  }, [gameRef, playerNum]);

  const drawCurrentSprite = React.useCallback(
    ({ outline, ctx, spriteX }) => {
      const spriteY = outline ? 32 : 0;
      ctx.drawImage(
        spriteSheet,
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
    [spriteSheet]
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
    ({ ctx, spriteX, videoCoordinates }) => {
      ctx.save();
      ctx.clearRect(0, 0, PLAYER_CANVAS_SIZE, PLAYER_CANVAS_SIZE);
      ctx.imageSmoothingEnabled = false;
      drawCurrentSprite({ outline: false, ctx, spriteX });

      if (videoCoordinates) {
        drawVideoSnapshot({ ctx, videoCoordinates });
        ctx.globalCompositeOperation = "overlay";
        drawCurrentSprite({ spriteX, ctx, outline: false });
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

    drawPlayerToCanvas({ ctx, spriteX, videoCoordinates });
    ctx.restore();
  }, [
    coords,
    direction,
    drawPlayerToCanvas,
    mouthState,
    spriteSheet,
    videoCoordinates,
    videoRef,
  ]);

  React.useEffect(() => {
    if (status !== COMPLETED_ROUND) {
      return;
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = PLAYER_CANVAS_SIZE;
    tempCanvas.height = PLAYER_CANVAS_SIZE;
    const ctx = tempCanvas.getContext("2d");
    drawPlayerToCanvas({ ctx, spriteX: 0, videoCoordinates });
    const faceCapture = tempCanvas.toDataURL("image/png");

    const boundingRect = myRef.current.getBoundingClientRect();
    console.log(`SCREENSHOTTED PLAYER ${playerNum}`);
    const position = {
      x: boundingRect.left,
      y: boundingRect.top,
    };
    addPacmanResultScreenState({ playerNum, faceCapture, position });
  }, [
    addPacmanResultScreenState,
    drawPlayerToCanvas,
    playerNum,
    status,
    videoCoordinates,
  ]);

  return coords ? (
    <Player
      ref={myRef}
      data-player={`player-${playerNum}`}
      style={{
        "--left": `${(coords.x / numSlots.horizontal) * 100}%`,
        "--top": `${(coords.y / numSlots.vertical) * 100}%`,
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
  z-index: ${zIndex1}
  width: ${PLAYER_SIZE_PERCENT}%;
  aspect-ratio: 1/1;
  left: var(--left);
  top: var(--top);
  animation: ${fadeIn} 0.5s forwards;
`;

const InteriorCanvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

export default React.memo(Pacman);
