import React from "react";
import styled, { keyframes } from "styled-components";
import { SLOT_WIDTH_PERCENTAGE } from "../../constants";
import { range } from "../../utils";
import Pacman from "../Pacman";

function Playfield({
  videoEnabled,
  videoRef,
  gameRef,
  spriteSheets,
  numPlayers,
}) {
  const [pellets, setPellets] = React.useState([]);
  const [padding, setPadding] = React.useState({});
  const [numSlots, setNumSlots] = React.useState({});
  const [initializedPlayfield, setInitializedPlayfield] = React.useState(false);
  console.log(`num players is: ${numPlayers}`);

  React.useEffect(() => {
    if (initializedPlayfield) {
      return;
    }

    const NUM_SLOTS_IN_LARGER_DIMENSION = 21;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const largerDimension = Math.max(width, height);
    const smallerDimension = Math.min(width, height);

    const numSlotsSmall = Math.floor(
      (NUM_SLOTS_IN_LARGER_DIMENSION * smallerDimension) / largerDimension
    );

    const slotWidthRemainderLarge =
      largerDimension % NUM_SLOTS_IN_LARGER_DIMENSION;
    const slotWidthRemainderSmall = smallerDimension % numSlotsSmall;

    const paddingBySize = {
      small: {
        roundedDown: Math.floor(slotWidthRemainderSmall / 2),
        roundedUp: Math.ceil(slotWidthRemainderSmall / 2),
      },
      large: {
        roundedDown: Math.floor(slotWidthRemainderLarge / 2),
        roundedUp: Math.ceil(slotWidthRemainderLarge / 2),
      },
    };

    let _numSlots;
    if (height > width) {
      _numSlots = {
        horizontal: numSlotsSmall,
        vertical: NUM_SLOTS_IN_LARGER_DIMENSION,
      };
      setPadding({
        left: paddingBySize.small.roundedDown,
        right: paddingBySize.small.roundedUp,
        top: paddingBySize.large.roundedDown,
        bottom: paddingBySize.large.roundedUp,
      });
    } else {
      _numSlots = {
        horizontal: NUM_SLOTS_IN_LARGER_DIMENSION,
        vertical: numSlotsSmall,
      };
      setPadding({
        left: paddingBySize.large.roundedDown,
        right: paddingBySize.large.roundedUp,
        top: paddingBySize.small.roundedDown,
        bottom: paddingBySize.small.roundedUp,
      });
    }
    setNumSlots(_numSlots);
    console.log(`num slots is: ${JSON.stringify(_numSlots)}`);

    setInitializedPlayfield(true);
    if (!gameRef.current) {
      throw new Error("BUG: gameRef.current is not set.");
    }
    gameRef.current.initNumSlots(_numSlots);
    gameRef.current.subscribeToPellets(setPellets);
  }, [gameRef, initializedPlayfield, numSlots]);

  React.useEffect(() => {
    if (!videoEnabled) {
      return;
    }
    gameRef.current.generatePellets();
  }, [videoEnabled, gameRef]);
  const score = pellets.filter((pellet) => !pellet.enabled).length;

  return (
    <Wrapper $padding={padding}>
      <ScoreContainer>
        <ScoreText key={score} $noAnimation={score === 0}>
          {score}
        </ScoreText>
      </ScoreContainer>
      {numPlayers === null
        ? null
        : range(numPlayers).map((playerNum) => {
            const spriteSheet =
              playerNum % 2 === 0
                ? spriteSheets.current["yellow"]
                : spriteSheets.current["pink"];

            return (
              <Pacman
                key={playerNum}
                gameRef={gameRef}
                videoRef={videoRef}
                spriteSheet={spriteSheet}
                numSlots={numSlots}
                playerNum={playerNum}
              />
            );
          })}
      {pellets.map((pellet) => {
        return (
          <PelletWrapper
            key={`${pellet.x}-${pellet.y}`}
            style={{
              "--left": `${(pellet.x / numSlots.horizontal) * 100}%`,
              "--top": `${(pellet.y / numSlots.vertical) * 100}%`,
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
  padding: ${(p) =>
    `${p.$padding.top}px ${p.$padding.right}px ${p.$padding.bottom}px ${p.$padding.left}px`};
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
  width: ${SLOT_WIDTH_PERCENTAGE}%;
  aspect-ratio: 1/1;
  display: grid;
  place-items: center;
`;

export default Playfield;
