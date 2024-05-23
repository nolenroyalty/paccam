import React from "react";
import styled, { keyframes } from "styled-components";
import { PLAYFIELD_SIZE, SLOT_WIDTH } from "../../constants";
import Pacman from "../Pacman";

function Playfield({
  videoEnabled,
  videoRef,
  gameRef,
  pacmanYellow,
  pacmanPink,
}) {
  const [pellets, setPellets] = React.useState([]);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }

    if (!gameRef.current) {
      throw new Error("BUG: gameRef.current is not set.");
    }

    gameRef.current.subscribeToPellets(setPellets);
    gameRef.current.generatePellets();
  }, [gameRef, videoEnabled]);

  const score = pellets.filter((pellet) => !pellet.enabled).length;

  return (
    <Wrapper>
      <ScoreContainer>
        <ScoreText key={score} $noAnimation={score === 0}>
          {score}
        </ScoreText>
      </ScoreContainer>
      <Pacman
        gameRef={gameRef}
        videoRef={videoRef}
        enabled={videoEnabled}
        spriteSheet={pacmanPink}
      />
      {pellets.map((pellet) => {
        return (
          <PelletWrapper
            key={`${pellet.x}-${pellet.y}`}
            style={{
              "--left": `${(pellet.x / PLAYFIELD_SIZE) * 100}%`,
              "--top": `${(pellet.y / PLAYFIELD_SIZE) * 100}%`,
              "--opacity": pellet.enabled ? 1 : 0,
              "--scale": pellet.enabled ? 1 : 0,
            }}
          >
            <Pellet
              data-x={pellet.x}
              alt=""
              src="/aseprite/pellet.png"
            ></Pellet>
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

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  pointer-events: none;
`;

const Pellet = styled.img`
  display: inline-block;
  width: ${50}%;

  opacity: var(--opacity);
  transform: scale(var(--scale));
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
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
