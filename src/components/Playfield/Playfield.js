import React from "react";
import styled, { keyframes } from "styled-components";
import {
  NUM_SLOTS_IN_LARGER_DIMENSION,
  pelletSizeInSlots,
} from "../../constants";
import { range } from "../../utils";
import Pacman from "../Pacman";
import { zIndex2 } from "../../zindex";
import {
  COUNTING_IN_ROUND,
  RUNNING_ROUND,
  SHOWING_RESULTS,
  COMPLETED_ROUND,
} from "../../STATUS";

function Playfield({
  videoRef,
  gameRef,
  spriteSheets,
  totalPlayers,
  status,
  addPacmanResultScreenState,
  debugInfo,
}) {
  const [pellets, setPellets] = React.useState([]);
  const [initializedPlayfield, setInitializedPlayfield] = React.useState(false);
  const [playfieldSize, setPlayfieldSize] = React.useState({
    shrinkVertical: 0,
    shrinkHorizontal: 0,
  });
  const selfRef = React.useRef();

  React.useEffect(() => {
    if (initializedPlayfield) {
      return;
    }

    // SO the idea is
    // We want to work on any sized screen. I picked a number of slots (21) that seems
    // to feel ~ok in the larger dimension for a few different screens. Then we derive
    // the number of slots for the smaller dimension based on that.
    //
    // This means that the number of slots in the smaller direction is not a round number,
    // so we have some padding that we need to account for (that's represented by smallSidePadding).
    // We shrink our playfield based on that value, and then slightly blur the area outside of
    // the playfield to make it clear what there's a small area that's not in play.

    const bb = selfRef.current.getBoundingClientRect();
    const width = bb.width;
    const height = bb.height;

    const largerDimension = Math.max(width, height);
    const smallerDimension = Math.min(width, height);

    const slotSizePx = largerDimension / NUM_SLOTS_IN_LARGER_DIMENSION;
    const numSlotsSmallWithRemainder = smallerDimension / slotSizePx;
    const numSlotsSmall = Math.floor(numSlotsSmallWithRemainder);
    const numSlotsSmallRemainder = numSlotsSmallWithRemainder - numSlotsSmall;
    const smallSidePadding = slotSizePx * numSlotsSmallRemainder;

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
      _playfieldSize.padding = {
        left: 0,
        right: 0,
        top: Math.ceil(smallSidePadding),
        bottom: Math.floor(smallSidePadding),
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
      slotSizePx: slotSizePx,
    });
    gameRef.current.subscribeToPellets(setPellets);
  }, [gameRef, initializedPlayfield, playfieldSize]);

  const opacity =
    status !== SHOWING_RESULTS && status !== COMPLETED_ROUND ? 1 : 0;

  const slotWidth = 100 / playfieldSize.horizontalSlots;
  const slotHeight = 100 / playfieldSize.verticalSlots;
  const slotSizePx = playfieldSize.slotSizePx;

  const borderBlockStyle = (() => {
    const w =
      playfieldSize.shrinkHorizontal === 0
        ? "100%"
        : playfieldSize.shrinkHorizontal / 2 + "px";
    const h =
      playfieldSize.shrinkVertical === 0
        ? "100%"
        : playfieldSize.shrinkVertical / 2 + "px";
    const backdropFilter =
      status === COUNTING_IN_ROUND || status === RUNNING_ROUND
        ? "brightness(0.95) blur(10px)"
        : "none";

    return { "--width": w, "--height": h, "--backdrop-filter": backdropFilter };
  })();

  const wrapperFlexDirection =
    playfieldSize.shrinkVertical === 0 ? "row" : "column";

  return (
    <Wrapper
      style={{ "--opacity": opacity, "--flex-direction": wrapperFlexDirection }}
      ref={selfRef}
    >
      <BorderBlock style={borderBlockStyle} />
      <InnerRelativeWrapper
        style={{
          "--shrink-vertical": playfieldSize.shrinkVertical + "px",
          "--shrink-horizontal": playfieldSize.shrinkHorizontal + "px",
        }}
      >
        {totalPlayers === null
          ? null
          : range(totalPlayers).map((playerNum) => {
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
                "--left": `${slotSizePx * pellet.x}px`,
                "--top": `${slotSizePx * pellet.y}px`,
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
      <BorderBlock style={borderBlockStyle} />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  pointer-events: none;
  z-index: ${zIndex2};
  opacity: var(--opacity);
  transition: opacity 0.5s ease-out;
  display: flex;
  flex-direction: var(--flex-direction);
  justify-content: center;
  align-items: center;
`;

const BorderBlock = styled.div`
  width: var(--width);
  height: var(--height);
  z-index: 1;
  backdrop-filter: var(--backdrop-filter);
  -webkit-backdrop-filter: var(--backdrop-filter);
  transition: backdrop-filter 0.5s ease-out;
`;

const InnerRelativeWrapper = styled.div`
  position: relative;
  width: calc(100% - var(--shrink-horizontal));
  height: calc(100% - var(--shrink-vertical));
  z-index: -1;
  /* overflow: hidden; */
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
