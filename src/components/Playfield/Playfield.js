import React from "react";
import styled from "styled-components";

const SIZE = 100;
const PLAYER_SIZE = 15;
const SPEED_PER_SECOND = SIZE / 2;
const MOVEMENT_POINTS_PER_CONSUME = 0.15;

/* nroyalty: instead of "consuming" like this maybe we can just
  embed a counter directly in our state that it increments when
  we move, and every time that updates we add movement points.

  On top of that, maybe we can just only add movement points like
  0.1 seconds after they've been submitted if the mouth is still in the
  same state? Maybe only doing something different if there are no movement
  points, so that movement always starts immediately.
*/

function Playfield({
  videoEnabled,
  faceState,
  consumeMouthClosed,
  consumeMouthOpen,
  videoRef,
  gameRef,
}) {
  const [coords, setCoords] = React.useState({ x: 40, y: 40 });

  const movementPoints = React.useRef(0);
  const canvasRef = React.useRef();
  const [direction, setDirection] = React.useState("center");
  const [mouthState, setMouthState] = React.useState("closed");
  const [videoCoordinates, setVideoCoordinates] = React.useState(null);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }

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

  // nroyalty: This could soon live in a separate pacman component
  // that we move around by subscribing to position (??)
  React.useEffect(() => {
    if (!videoEnabled) {
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
  }, [gameRef, videoEnabled]);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    ctx.save();
    ctx.fillStyle = "yellow";
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.beginPath();
    ctx.moveTo(SIZE / 2, SIZE / 2);

    let halfAngle = mouthState === "closed" ? Math.PI / 25 : Math.PI / 5;
    let startAngle = halfAngle;
    if (direction === "up") {
      startAngle += 1.5 * Math.PI;
    } else if (direction === "left") {
      startAngle += Math.PI;
    } else if (direction === "down") {
      startAngle += Math.PI / 2;
    }
    const endAngle = startAngle - 2 * halfAngle;

    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, startAngle, endAngle);
    ctx.moveTo(SIZE / 2, SIZE / 2);
    ctx.fill();

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
  }, [videoEnabled, videoRef, direction, mouthState, videoCoordinates]);

  // React.useEffect(() => {
  //   if (!videoEnabled) {
  //     return;
  //   }

  //   let animationFrameId;

  //   function loop(timestamp) {
  //     const consumptionAmount =
  //       lastFrameTime.current === 0 ? 0 : timestamp - lastFrameTime.current;
  //     lastFrameTime.current = timestamp;

  //     // bug where you can rack up lots of points before moving...
  //     if (direction.current !== "center") {
  //       const pointsToConsume = Math.min(
  //         movementPoints.current,
  //         consumptionAmount / 1000
  //       );
  //       movementPoints.current -= pointsToConsume;
  //       const movementAmount = pointsToConsume * SPEED_PER_SECOND;
  //       if (direction.current === "up") {
  //         setCoords((coords) => {
  //           const y = Math.max(coords.y - movementAmount, 0);
  //           console.log(`SET Y TO ${y}`);
  //           return { ...coords, y };
  //         });
  //       } else if (direction.current === "down") {
  //         setCoords((coords) => {
  //           const y = Math.min(coords.y + movementAmount, SIZE - PLAYER_SIZE);
  //           return { ...coords, y };
  //         });
  //       } else if (direction.current === "left") {
  //         setCoords((coords) => {
  //           const x = Math.max(coords.x - movementAmount, 0);
  //           return { ...coords, x };
  //         });
  //       } else if (direction.current === "right") {
  //         setCoords((coords) => {
  //           const x = Math.min(coords.x + movementAmount, SIZE - PLAYER_SIZE);
  //           return { ...coords, x };
  //         });
  //       }
  //     }

  //     animationFrameId = requestAnimationFrame(loop);
  //   }

  //   animationFrameId = requestAnimationFrame(loop);
  //   return () => {
  //     console.log("BUG: cancelling game loop animation...");
  //     cancelAnimationFrame(animationFrameId);
  //   };
  // }, [videoEnabled]);

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
