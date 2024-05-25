import React from "react";
import styled, { keyframes } from "styled-components";
import { SLOT_WIDTH_PERCENTAGE } from "../../constants";
import { range } from "../../utils";
import Pacman from "../Pacman";
import { zIndex2 } from "../../zindex";
import { SHOWING_RESULTS, COMPLETED_ROUND } from "../../STATUS";

function Playfield({
  videoRef,
  gameRef,
  spriteSheets,
  numPlayers,
  status,
  addPacmanResultScreenState,
  setSlotSizePx,
  playfieldPadding,
  setPlayfieldPadding,
}) {
  const [pellets, setPellets] = React.useState([]);
  const [numSlots, setNumSlots] = React.useState({});
  const [initializedPlayfield, setInitializedPlayfield] = React.useState(false);

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
      setSlotSizePx(height / NUM_SLOTS_IN_LARGER_DIMENSION);
      setPlayfieldPadding({
        left: paddingBySize.small.roundedDown,
        right: paddingBySize.small.roundedUp,
        top: paddingBySize.large.roundedDown,
        bottom: paddingBySize.large.roundedUp,
      });
    } else {
      setSlotSizePx(width / NUM_SLOTS_IN_LARGER_DIMENSION);
      _numSlots = {
        horizontal: NUM_SLOTS_IN_LARGER_DIMENSION,
        vertical: numSlotsSmall,
      };
      setPlayfieldPadding({
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
  }, [
    gameRef,
    initializedPlayfield,
    numSlots,
    setSlotSizePx,
    setPlayfieldPadding,
  ]);

  console.log(`playfield padding is ${JSON.stringify(playfieldPadding)}`);

  const opacity =
    status !== SHOWING_RESULTS && status !== COMPLETED_ROUND ? 1 : 0;

  return (
    <Wrapper $padding={playfieldPadding} style={{ "--opacity": opacity }}>
      {numPlayers === null
        ? null
        : range(numPlayers).map((playerNum) => {
            let spriteSheet = spriteSheets.current["yellow"];
            if (playerNum === 1) {
              spriteSheet = spriteSheets.current["pink"];
            } else if (playerNum === 2) {
              spriteSheet = spriteSheets.current["green"];
            } else if (playerNum === 3) {
              spriteSheet = spriteSheets.current["orange"];
            }

            return (
              <Pacman
                key={playerNum}
                gameRef={gameRef}
                videoRef={videoRef}
                spriteSheet={spriteSheet}
                numSlots={numSlots}
                playerNum={playerNum}
                addPacmanResultScreenState={addPacmanResultScreenState}
                status={status}
                padding={playfieldPadding}
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
              "--padding-left": `${playfieldPadding.left}px`,
              "--padding-top": `${playfieldPadding.top}px`,
              "--opacity": pellet.enabled ? 1 : 0,
              "--scale": pellet.enabled ? null : 0,
            }}
          >
            <Pellet
              data-x={pellet.x}
              alt=""
              src="/aseprite/pellet.png"
              style={{ "--delay": pellet.delay + "s" }}
            ></Pellet>
          </PelletWrapper>
        );
      })}
      {/* <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          backgroundColor: "green",
        }}
      ></div> */}
    </Wrapper>
  );
}

/* PADDING DOES NOT WORK RIGHT NOW */
const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  pointer-events: none;
  padding: ${(p) =>
    `${p.$padding.top}px ${p.$padding.right}px ${p.$padding.bottom}px ${p.$padding.left}px`};
  z-index: ${zIndex2};
  opacity: var(--opacity);
  transition: opacity 0.5s ease-out;
`;

const PopIn = keyframes`
  0% {
    transform: scale(0) translateY(200%);
  }

  60% {
    transform: scale(1.2);
  }

  100% {
    transform: scale(1);
  }
`;

const Pellet = styled.img`
  display: inline-block;
  width: ${50}%;

  opacity: var(--opacity);
  transition:
    opacity 0.5s ease-out,
    transform 0.3s ease-out;

  animation: ${PopIn} 0.75s backwards var(--delay);
  transform: scale(var(--scale));
`;

const PelletWrapper = styled.div`
  position: absolute;
  left: calc(var(--left) + var(--padding-left));
  top: calc(var(--top) + var(--padding-top));
  width: ${SLOT_WIDTH_PERCENTAGE}%;
  aspect-ratio: 1/1;
  display: grid;
  place-items: center;
`;

export default Playfield;
