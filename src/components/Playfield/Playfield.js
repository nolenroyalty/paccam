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
}) {
  const [coords, setCoords] = React.useState({ x: 40, y: 40 });

  const movementPoints = React.useRef(0);
  const direction = React.useRef("center");
  const lastFrameTime = React.useRef(0);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }
    direction.current = faceState.direction;
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
      />
    </Wrapper>
  );
}

const Player = styled.div`
  position: absolute;
  width: ${(PLAYER_SIZE * 100) / SIZE}%;
  aspect-ratio: 1/1;
  left: var(--left);
  top: var(--top);
  border-radius: 50%;
  background-color: white;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

export default Playfield;
