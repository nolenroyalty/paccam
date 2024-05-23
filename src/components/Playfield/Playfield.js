import React from "react";
import styled, { keyframes } from "styled-components";
import { PLAYFIELD_SIZE, PLAYER_SIZE, SLOT_WIDTH } from "../../constants";
const PLAYER_CANVAS_SIZE = 128;

/* nroyalty: instead of "consuming" like this maybe we can just
  embed a counter directly in our state that it increments when
  we move, and every time that updates we add movement points.

  On top of that, maybe we can just only add movement points like
  0.1 seconds after they've been submitted if the mouth is still in the
  same state? Maybe only doing something different if there are no movement
  points, so that movement always starts immediately.
*/

function Playfield({ videoEnabled, videoRef, gameRef, pacmanYellow }) {
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });

  const canvasRef = React.useRef();
  const [direction, setDirection] = React.useState("center");
  const [mouthState, setMouthState] = React.useState("closed");
  const [videoCoordinates, setVideoCoordinates] = React.useState(null);
  const [pellets, setPellets] = React.useState([]);

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

    const updatePosition = (pos) => {
      setCoords(pos);
    };

    if (!gameRef.current) {
      throw new Error("BUG: gameRef.current is not set.");
    }

    gameRef.current.subscribeToFaceState(updateFaceState);
    gameRef.current.subscribeToPosition(updatePosition);
    gameRef.current.subscribeToPellets(setPellets);

    gameRef.current.generatePellets();
  }, [gameRef, videoEnabled]);

  React.useEffect(() => {
    if (!videoEnabled) {
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

    const pacman = pacmanYellow.current;
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
  }, [
    direction,
    mouthState,
    pacmanYellow,
    videoCoordinates,
    videoEnabled,
    videoRef,
  ]);

  const score = pellets.filter((pellet) => !pellet.enabled).length;

  return (
    <Wrapper>
      <ScoreContainer>
        <ScoreText key={score} $noAnimation={score === 0}>
          {score}
        </ScoreText>
      </ScoreContainer>
      <Player
        style={{
          "--left": (coords.x / PLAYFIELD_SIZE) * 100 + "%",
          "--top": (coords.y / PLAYFIELD_SIZE) * 100 + "%",
        }}
      >
        <InteriorCanvas
          ref={canvasRef}
          width={PLAYER_CANVAS_SIZE}
          height={PLAYER_CANVAS_SIZE}
        />
      </Player>
      {pellets.map((pellet) => {
        return (
          <PelletWrapper
            key={`${pellet.x}-${pellet.y}`}
            style={{
              "--left": `${(pellet.x / PLAYFIELD_SIZE) * 100}%`,
              "--top": `${(pellet.y / PLAYFIELD_SIZE) * 100}%`,
              "--opacity": pellet.enabled ? 0.7 : 0,
            }}
          >
            <Pellet data-x={pellet.x} />
          </PelletWrapper>
        );
      })}
    </Wrapper>
  );
}

const ScoreContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 0;
`;

const ScorePulse = keyframes`
  0% {
    transform: revert;
  }

  10% {
    transform: translateY(calc(var(--jump-amount) * -0.5));
  }

  60% {
    transform: translateY(var(--jump-amount));
  }

  100% {
    transform: revert;
  }
`;

const ScoreText = styled.h2`
  color: white;
  font-size: 3.5rem;
  font-family: "Arcade Classic";
  margin: 0;

  --jump-amount: ${(p) => (p.$noAnimation ? "0" : "-10%")};
  animation: ${ScorePulse} 0.3s ease-out;
`;

const InteriorCanvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

const Player = styled.div`
  position: absolute;
  width: ${(PLAYER_SIZE * 100) / PLAYFIELD_SIZE}%;
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

const Pellet = styled.span`
  display: inline-block;
  width: ${50}%;

  aspect-ratio: 1/1;
  background-color: white;
  border-radius: 50%;
  opacity: var(--opacity);
`;

const PelletWrapper = styled.div`
  position: absolute;
  left: var(--left);
  top: var(--top);
  width: ${SLOT_WIDTH}%;
  aspect-ratio: 1/1;
  display: grid;
  place-items: center;
`;

export default Playfield;
