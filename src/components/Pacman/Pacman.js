import React from "react";
import styled from "styled-components";
import { PLAYER_SIZE_PERCENT } from "../../constants";
const PLAYER_CANVAS_SIZE = 128;

function Pacman({ gameRef, videoRef, enabled, spriteSheet, numSlots }) {
  const canvasRef = React.useRef();
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const [direction, setDirection] = React.useState("center");
  const [mouthState, setMouthState] = React.useState("closed");
  const [videoCoordinates, setVideoCoordinates] = React.useState(null);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

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

    gameRef.current.subscribeToFaceState(updateFaceState);
    gameRef.current.subscribeToPosition(setCoords);
  }, [enabled, gameRef]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    const ctx = canvasRef.current.getContext("2d");
    ctx.save();

    let xIdx = 0;
    if (mouthState === "open") {
      xIdx += 4;
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

    const pacman = spriteSheet.current;
    const spriteWidth = 32;
    const spriteHeight = 32;
    const spriteX = xIdx * 32;

    ctx.clearRect(0, 0, PLAYER_CANVAS_SIZE, PLAYER_CANVAS_SIZE);
    ctx.imageSmoothingEnabled = false;
    const drawCurrentSprite = ({ outline }) => {
      const spriteY = outline ? 32 : 0;
      ctx.drawImage(
        pacman,
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
  }, [direction, enabled, mouthState, spriteSheet, videoCoordinates, videoRef]);

  return (
    <Player
      data-player="player"
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
  );
}

const Player = styled.div`
  position: absolute;
  width: ${PLAYER_SIZE_PERCENT}%;
  aspect-ratio: 1/1;
  left: var(--left);
  top: var(--top);
`;

const InteriorCanvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

export default Pacman;