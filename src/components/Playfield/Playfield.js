import React from "react";
import styled from "styled-components";
import { PLAYFIELD_SIZE, PLAYER_SIZE, SLOT_WIDTH } from "../../constants";

/* nroyalty: instead of "consuming" like this maybe we can just
  embed a counter directly in our state that it increments when
  we move, and every time that updates we add movement points.

  On top of that, maybe we can just only add movement points like
  0.1 seconds after they've been submitted if the mouth is still in the
  same state? Maybe only doing something different if there are no movement
  points, so that movement always starts immediately.
*/

function Playfield({ videoEnabled, videoRef, gameRef }) {
  const [coords, setCoords] = React.useState({ x: 40, y: 40 });

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
    ctx.fillStyle = "yellow";
    ctx.clearRect(0, 0, PLAYFIELD_SIZE, PLAYFIELD_SIZE);
    ctx.beginPath();
    ctx.moveTo(PLAYFIELD_SIZE / 2, PLAYFIELD_SIZE / 2);

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

    ctx.arc(
      PLAYFIELD_SIZE / 2,
      PLAYFIELD_SIZE / 2,
      PLAYFIELD_SIZE / 2,
      startAngle,
      endAngle
    );
    ctx.moveTo(PLAYFIELD_SIZE / 2, PLAYFIELD_SIZE / 2);
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
      ctx.translate(-PLAYFIELD_SIZE, 0);
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
        PLAYFIELD_SIZE,
        PLAYFIELD_SIZE
      );
    }
    ctx.restore();
  }, [videoEnabled, videoRef, direction, mouthState, videoCoordinates]);

  return (
    <Wrapper>
      <Player
        style={{
          "--left": (coords.x / PLAYFIELD_SIZE) * 100 + "%",
          "--top": (coords.y / PLAYFIELD_SIZE) * 100 + "%",
        }}
      >
        <InteriorCanvas
          ref={canvasRef}
          width={PLAYFIELD_SIZE}
          height={PLAYFIELD_SIZE}
        />
      </Player>
      {pellets.map((pellet) => {
        return (
          <PelletWrapper
            key={`${pellet.x}-${pellet.y}`}
            style={{
              "--left": `${(pellet.x / PLAYFIELD_SIZE) * 100}%`,
              "--top": `${(pellet.y / PLAYFIELD_SIZE) * 100}%`,
            }}
          >
            <Pellet data-x={pellet.x} />
          </PelletWrapper>
        );
      })}
    </Wrapper>
  );
}

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
  opacity: 0.7;
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
