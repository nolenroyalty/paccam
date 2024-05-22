import React from "react";
import styled from "styled-components";

const SIZE = 100;
const PLAYER_SIZE = 15;
const SPEED_PER_SECOND = SIZE / 2;
const MOVEMENT_POINTS_PER_CONSUME = 0.15;

function Playfield({
  videoEnabled,
  faceState,
  consumeMouthClosed,
  consumeMouthOpen,
  videoRef,
}) {
  const [coords, setCoords] = React.useState({ x: 40, y: 40 });

  const movementPoints = React.useRef(0);
  const direction = React.useRef("center");
  const mouthState = React.useRef("closed");
  const videoCoordinates = React.useRef(null);
  const lastFrameTime = React.useRef(0);
  const canvasRef = React.useRef();

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }
    direction.current = faceState.direction;
    mouthState.current = faceState.mouthOpen ? "open" : "closed";
    videoCoordinates.current = faceState.videoCoordinates;
    if (faceState.mouthOpen && !faceState.consumedMouthOpen) {
      console.log("ADD MOUTH OPEN POINTS");
      movementPoints.current += MOVEMENT_POINTS_PER_CONSUME;
      consumeMouthOpen();
    } else if (!faceState.mouthOpen && !faceState.consumedMouthClosed) {
      console.log("ADD MOUTH CLOSED POINTS");
      movementPoints.current += MOVEMENT_POINTS_PER_CONSUME;
      consumeMouthClosed();
    }
  }, [consumeMouthClosed, consumeMouthOpen, faceState, videoEnabled]);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }
    const ctx = canvasRef.current.getContext("2d");
    let animationFrameId;

    function loop() {
      ctx.save();
      ctx.fillStyle = "yellow";

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.beginPath();
      ctx.moveTo(SIZE / 2, SIZE / 2);

      let halfAngle =
        mouthState.current === "closed" ? Math.PI / 25 : Math.PI / 5;

      let startAngle = halfAngle;
      if (direction.current === "up") {
        startAngle += 1.5 * Math.PI;
      } else if (direction.current === "left") {
        startAngle += Math.PI;
      } else if (direction.current === "down") {
        startAngle += Math.PI / 2;
      }

      const endAngle = startAngle - 2 * halfAngle;

      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, startAngle, endAngle);
      ctx.moveTo(SIZE / 2, SIZE / 2);
      ctx.fill();

      if (videoCoordinates.current) {
        ctx.globalCompositeOperation = "source-atop";
        let { minX, minY, maxX, maxY } = videoCoordinates.current;
        let tempMaxX = 1 - minX;
        minX = 1 - maxX;
        maxX = tempMaxX;
        const height = maxY - minY;
        minY -= height * 0.1;
        maxY += height * 0.1;
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;

        ctx.globalAlpha = 0.6;
        ctx.scale(-1, 1);
        ctx.translate(-SIZE, 0);
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
          SIZE,
          SIZE
        );
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);
    return () => {
      console.log("BUG: cancelling pacman draw animation...");
      cancelAnimationFrame(animationFrameId);
    };
  }, [videoEnabled]);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }

    let animationFrameId;

    function loop(timestamp) {
      const consumptionAmount =
        lastFrameTime.current === 0 ? 0 : timestamp - lastFrameTime.current;
      lastFrameTime.current = timestamp;

      // bug where you can rack up lots of points before moving...
      if (direction.current !== "center") {
        const pointsToConsume = Math.min(
          movementPoints.current,
          consumptionAmount / 1000
        );
        movementPoints.current -= pointsToConsume;
        const movementAmount = pointsToConsume * SPEED_PER_SECOND;
        if (direction.current === "up") {
          setCoords((coords) => {
            const y = Math.max(coords.y - movementAmount, 0);
            console.log(`SET Y TO ${y}`);
            return { ...coords, y };
          });
        } else if (direction.current === "down") {
          setCoords((coords) => {
            const y = Math.min(coords.y + movementAmount, SIZE - PLAYER_SIZE);
            return { ...coords, y };
          });
        } else if (direction.current === "left") {
          setCoords((coords) => {
            const x = Math.max(coords.x - movementAmount, 0);
            return { ...coords, x };
          });
        } else if (direction.current === "right") {
          setCoords((coords) => {
            const x = Math.min(coords.x + movementAmount, SIZE - PLAYER_SIZE);
            return { ...coords, x };
          });
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);
    return () => {
      console.log("BUG: cancelling game loop animation...");
      cancelAnimationFrame(animationFrameId);
    };
  }, [videoEnabled]);

  return (
    <Wrapper>
      <Player
        style={{
          "--left": (coords.x / SIZE) * 100 + "%",
          "--top": (coords.y / SIZE) * 100 + "%",
        }}
      >
        <InteriorCanvas ref={canvasRef} width={SIZE} height={SIZE} />
      </Player>
    </Wrapper>
  );
}

const InteriorCanvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

const Player = styled.div`
  position: absolute;
  width: ${(PLAYER_SIZE * 100) / SIZE}%;
  aspect-ratio: 1/1;
  left: var(--left);
  top: var(--top);
  border-radius: 50%;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  pointer-events: none;
`;

export default Playfield;
