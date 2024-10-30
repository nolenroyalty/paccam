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

const PelletItem = React.memo(
  ({ x, y, kind, enabled, delay, slotSizePx, slotWidth, status }) => {
    const imgSrc = React.useMemo(() => {
      if (kind === "pellet") {
        return "/aseprite/pellet.png";
      } else if (kind === "fruit") {
        return "/aseprite/strawberry2.png";
      } else if (kind === "power-pellet") {
        return "/aseprite/powerpellet.png";
      }
      throw new Error(`Unknown pellet kind: ${kind}`);
    }, [kind]);

    const wrapperStyle = React.useMemo(() => {
      return {
        "--left": `${slotSizePx * x}px`,
        "--top": `${slotSizePx * y}px`,
        "--opacity": enabled ? 1 : 0,
        "--scale": enabled ? null : 0,
        "--pellet-x": x,
        "--pellet-y": y,
        "--pellet-width": slotWidth + "%",
      };
    }, [enabled, slotSizePx, slotWidth, x, y]);

    const imgStyle = React.useMemo(() => {
      return {
        "--delay": delay + "s",
        "--size-in-slots": pelletSizeInSlots(kind),
        "--opacity-speed":
          status === COUNTING_IN_ROUND || status === RUNNING_ROUND
            ? "0.5s"
            : "0s",
        "--transform-speed":
          status === COUNTING_IN_ROUND || status === RUNNING_ROUND
            ? "0.3s"
            : "0s",
      };
    }, [delay, kind, status]);

    return (
      <PelletWrapper style={wrapperStyle}>
        <PelletImg
          $enabled={enabled}
          data-x={x}
          alt=""
          src={imgSrc}
          style={imgStyle}
        ></PelletImg>
      </PelletWrapper>
    );
  }
);

const PelletContainer = React.memo(
  ({ slotSizePx, slotWidth, gameRef, status }) => {
    const [pellets, setPellets] = React.useState([]);
    const id = React.useId();
    React.useEffect(() => {
      console.log("subscribing to pellet state");
      let game = gameRef.current;
      game.subscribeToPellets({ callback: setPellets, id });
      return () => {
        console.log("unsubscribing from pellet state");
        game.unsubscribeFromPellets({ id });
      };
    }, [gameRef, id]);

    return pellets.map((pellet) => (
      <PelletItem
        key={`${pellet.x}-${pellet.y}`}
        slotSizePx={slotSizePx}
        slotWidth={slotWidth}
        x={pellet.x}
        y={pellet.y}
        kind={pellet.kind}
        enabled={pellet.enabled}
        delay={pellet.delay}
        status={status}
      />
    ));
  }
);

function Playfield({
  videoRef,
  gameRef,
  spriteSheets,
  totalPlayers,
  numHumans,
  status,
  addPacmanResultScreenState,
  debugInfo,
  addPacmanFaceGifFrame,
  initializePacmanFaceGif,
}) {
  const [initializedPlayfield, setInitializedPlayfield] = React.useState(false);
  const [playfieldSize, setPlayfieldSize] = React.useState({
    shrinkVertical: 0,
    shrinkHorizontal: 0,
  });
  const selfRef = React.useRef();
  console.log("RENDERING PLAYFIELD");

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
  }, [gameRef, initializedPlayfield, playfieldSize]);

  const opacity =
    status !== SHOWING_RESULTS && status !== COMPLETED_ROUND ? 1 : 0;

  const slotWidth = 100 / playfieldSize.horizontalSlots;
  const slotHeight = 100 / playfieldSize.verticalSlots;
  const slotSizePx = playfieldSize.slotSizePx;

  const borderBlockStyle = (() => {
    const noShrinkage =
      playfieldSize.shrinkHorizontal === 0 &&
      playfieldSize.shrinkVertical === 0;
    const w = noShrinkage
      ? "0px"
      : playfieldSize.shrinkHorizontal === 0
        ? "100%"
        : playfieldSize.shrinkHorizontal / 2 + "px";
    const h = noShrinkage
      ? "0px"
      : playfieldSize.shrinkVertical === 0
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
                  isHuman={playerNum < numHumans}
                  addPacmanFaceGifFrame={addPacmanFaceGifFrame}
                  initializePacmanFaceGif={initializePacmanFaceGif}
                />
              );
            })}
        <PelletContainer
          slotSizePx={slotSizePx}
          slotWidth={slotWidth}
          gameRef={gameRef}
          status={status}
        />
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

const PelletImg = styled.img`
  @keyframes PelletImgPopIn {
    0% {
      transform: scale(0) translateY(200%);
    }

    60% {
      transform: scale(1.2);
    }

    100% {
      transform: scale(1);
    }
  }

  display: inline-block;
  width: calc(var(--size-in-slots) * 100%);

  opacity: var(--opacity);
  transition:
    opacity var(--opacity-speed) ease-out,
    transform var(--transform-speed) ease-out;

  // we flip our animation like this so that the delay for the animation
  // only kicks in when pellets are enabled. The only alternative I could
  // think of is swapping the key for a pellet, which results in a lot of
  // re-rendering of components, causing a loading hitch.
  animation: ${(p) => (p.$enabled ? "PelletImgPopIn" : "none")} 0.75s backwards
    var(--delay);
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

export default React.memo(Playfield);
