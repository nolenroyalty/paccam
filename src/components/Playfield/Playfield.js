import React from "react";
import styled, { keyframes } from "styled-components";
import {
  NUM_SLOTS_IN_LARGER_DIMENSION,
  pelletSizeInSlots,
} from "../../constants";
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
  debugInfo,
}) {
  const [pellets, setPellets] = React.useState([]);
  const [initializedPlayfield, setInitializedPlayfield] = React.useState(false);
  const [playfieldSize, setPlayfieldSize] = React.useState({
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
  });

  React.useEffect(() => {
    if (initializedPlayfield) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    const largerDimension = Math.max(width, height);
    const smallerDimension = Math.min(width, height);

    const slotSizePx = largerDimension / NUM_SLOTS_IN_LARGER_DIMENSION;
    const numSlotsSmallWithRemainder = smallerDimension / slotSizePx;
    const numSlotsSmall = Math.floor(numSlotsSmallWithRemainder);
    const numSlotsSmallRemainder = numSlotsSmallWithRemainder - numSlotsSmall;
    const smallSidePadding = slotSizePx * numSlotsSmallRemainder;

    // const numSlotsSmall = Math.floor(
    // (NUM_SLOTS_IN_LARGER_DIMENSION * smallerDimension) / largerDimension
    // );
    // const slotWidthRemainderLarge =
    //   largerDimension % NUM_SLOTS_IN_LARGER_DIMENSION;
    // const slotWidthRemainderSmall = smallerDimension % numSlotsSmall;

    // const paddingBySize = {
    //   small: {
    //     roundedDown: Math.floor(slotWidthRemainderSmall / 2),
    //     roundedUp: Math.ceil(slotWidthRemainderSmall / 2),
    //   },
    //   large: {
    //     roundedDown: Math.floor(slotWidthRemainderLarge / 2),
    //     roundedUp: Math.ceil(slotWidthRemainderLarge / 2),
    //   },
    // };

    const _playfieldSize = {
      width: width,
      height: height,
      slotSizePx: slotSizePx,
    };
    if (height > width) {
      _playfieldSize.horizontalSlots = numSlotsSmall;
      _playfieldSize.verticalSlots = NUM_SLOTS_IN_LARGER_DIMENSION;
      _playfieldSize.shrinkVertical = 0;
      _playfieldSize.shrinkHorizontal = smallSidePadding;
      // _playfieldSize.slotSizePx = height / NUM_SLOTS_IN_LARGER_DIMENSION;
      _playfieldSize.padding = {
        left: Math.ceil(smallSidePadding),
        right: Math.floor(smallSidePadding),
        top: 0,
        bottom: 0,
      };
    } else {
      _playfieldSize.horizontalSlots = NUM_SLOTS_IN_LARGER_DIMENSION;
      _playfieldSize.verticalSlots = numSlotsSmall;
      _playfieldSize.shrinkVertical = smallSidePadding;
      _playfieldSize.shrinkHorizontal = 0;
      // _playfieldSize.slotSizePx = width / NUM_SLOTS_IN_LARGER_DIMENSION;
      _playfieldSize.padding = {
        left: 0,
        right: 0,
        top: Math.ceil(smallSidePadding),
        bottom: Math.floor(smallSidePadding),
        // left: paddingBySize.large.roundedDown,
        // right: paddingBySize.large.roundedUp,
        // top: paddingBySize.small.roundedDown,
        // bottom: paddingBySize.small.roundedUp,
      };
    }
    setPlayfieldSize(_playfieldSize);
    console.log(`INITIALIZED PLAYFIELD: ${JSON.stringify(_playfieldSize)}`);
    setInitializedPlayfield(true);
    if (!gameRef.current) {
      throw new Error("BUG: gameRef.current is not set.");
    }
    gameRef.current.initNumSlots({
      horizontal: _playfieldSize.horizontalSlots,
      vertical: _playfieldSize.verticalSlots,
    });
    gameRef.current.subscribeToPellets(setPellets);
  }, [gameRef, initializedPlayfield, playfieldSize]);

  const opacity =
    status !== SHOWING_RESULTS && status !== COMPLETED_ROUND ? 1 : 0;

  const slotWidth = 100 / playfieldSize.horizontalSlots;
  const slotHeight = 100 / playfieldSize.verticalSlots;
  const slotSizePx = playfieldSize.slotSizePx;

  return (
    <Wrapper $padding={playfieldSize.padding} style={{ "--opacity": opacity }}>
      <InnerRelativeWrapper $padding={playfieldSize.padding}>
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
                  ghostSpriteSheet={spriteSheets.current["ghost"]}
                  superSpriteSheet={spriteSheets.current["super"]}
                  slotWidth={slotWidth}
                  slotHeight={slotHeight}
                  slotSizePx={slotSizePx}
                  playerNum={playerNum}
                  addPacmanResultScreenState={addPacmanResultScreenState}
                  status={status}
                  padding={playfieldSize.padding}
                  debugInfo={debugInfo[playerNum]}
                />
              );
            })}
        {pellets.map((pellet) => {
          let src;
          let sizeInSlots = pelletSizeInSlots(pellet.kind);
          if (pellet.kind === "pellet") {
            src = "/aseprite/pellet.png";
          } else if (pellet.kind === "fruit") {
            src = "/aseprite/strawberry2.png";
          } else if (pellet.kind === "power-pellet") {
            src = "/aseprite/powerpellet.png";
          } else {
            throw new Error(`Unknown pellet kind: ${pellet.kind}`);
          }
          return (
            <PelletWrapper
              key={`${pellet.x}-${pellet.y}`}
              style={{
                "--left": `${slotSizePx * pellet.x + playfieldSize.padding.left}px`,
                "--top": `${slotSizePx * pellet.y + playfieldSize.padding.top}px`,
                "--opacity": pellet.enabled ? 1 : 0,
                "--scale": pellet.enabled ? null : 0,
                "--pellet-x": pellet.x,
                "--pellet-y": pellet.y,
                "--pellet-width": slotWidth + "%",
              }}
            >
              <Pellet
                data-x={pellet.x}
                alt=""
                src={src}
                style={{
                  "--delay": pellet.delay + "s",
                  "--size-in-slots": sizeInSlots,
                }}
              ></Pellet>
            </PelletWrapper>
          );
        })}
      </InnerRelativeWrapper>
    </Wrapper>
  );
}

/* PADDING DOES NOT WORK RIGHT NOW */
const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  pointer-events: none;
  z-index: ${zIndex2};
  opacity: var(--opacity);
  transition: opacity 0.5s ease-out;
`;

const InnerRelativeWrapper = styled.div`
  position: relative;
  margin: auto;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: ${(p) => p.$padding.top}px ${(p) => p.$padding.right}px
    ${(p) => p.$padding.bottom}px ${(p) => p.$padding.left}px;
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
  width: calc(var(--size-in-slots) * 100%);

  opacity: var(--opacity);
  transition:
    opacity 0.5s ease-out,
    transform 0.3s ease-out;

  animation: ${PopIn} 0.75s backwards var(--delay);
  transform: scale(var(--scale));
  image-rendering: pixelated; /* Chrome, Firefox */
  image-rendering: -moz-crisp-edges; /* Firefox */
  image-rendering: crisp-edges; /* Safari */
  -ms-interpolation-mode: nearest-neighbor; /* IE */
`;

const PelletWrapper = styled.div`
  position: absolute;
  top: var(--top);
  left: var(--left);
  width: var(--pellet-width);
  aspect-ratio: 1/1;
  display: grid;
  place-items: center;
`;

export default Playfield;
