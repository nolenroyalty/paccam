import React from "react";
import styled, { keyframes } from "styled-components";
import { PLAYER_SIZE_PERCENT } from "../../constants";
const PLAYER_CANVAS_SIZE = 128;

function Pacman({ gameRef, videoRef, spriteSheet, numSlots, playerNum }) {
  const canvasRef = React.useRef();
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

    const spriteWidth = 32;
    const spriteHeight = 32;
    const spriteX = xIdx * 32;

    ctx.clearRect(0, 0, PLAYER_CANVAS_SIZE, PLAYER_CANVAS_SIZE);
    ctx.imageSmoothingEnabled = false;
    const drawCurrentSprite = ({ outline }) => {
      const spriteY = outline ? 32 : 0;
      ctx.drawImage(
        spriteSheet,
        spriteX,
        spriteY,
        spriteWidth,
        spriteHeight,
        0,
        0,
        PLAYER_CANVAS_SIZE,
        PLAYER_CANVAS_SIZE
      );
    };
    drawCurrentSprite({ outline: false });

    if (videoCoordinates) {
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
      ctx.globalCompositeOperation = "overlay";
      ctx.scale(-1, 1);
      ctx.translate(-PLAYER_CANVAS_SIZE, 0);
      drawCurrentSprite({ outline: false });
    }

    ctx.globalCompositeOperation = "source-over";
    // Make sure we draw this regardless of whether we have
    // video coordinates.
    drawCurrentSprite({ outline: true });
    ctx.restore();
  }, [coords, direction, mouthState, spriteSheet, videoCoordinates, videoRef]);

  return coords ? (
    <Player
      data-player={`player-${playerNum}`}
      style={{
        "--left": `${(coords.x / numSlots.horizontal) * 100}%`,
        "--top": `${(coords.y / numSlots.vertical) * 100}%`,
        "--opacity": coords ? 1 : 0,
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
