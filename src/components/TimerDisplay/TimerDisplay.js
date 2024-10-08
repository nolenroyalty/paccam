import React from "react";
import styled, { keyframes } from "styled-components";
import { zIndex1 } from "../../zindex";

function TimerDisplay({ gameRef }) {
  const [time, setTime] = React.useState(null);
  React.useEffect(() => {
    const game = gameRef.current;
    game.subscribeToTime(setTime);
  }, [gameRef]);

  const text = String(time);
  // no memory of why I did this first / last bit shit
  // think it's because of bad sizing on the ! char?
  // const firstBit = text.slice(0, -1);
  // const lastBit = text.slice(-1);

  return time === null || time === undefined ? null : (
    <Text key={text}>
      {text === "GO!" ? <span>&nbsp;</span> : null}
      {text}
      {/* <span>{firstBit}</span> */}
      {/* <NoSpacing>{lastBit}</NoSpacing> */}
    </Text>
  );
}

const PopInDropOut = keyframes`
  0% {
    transform: translate(-50%, -60%);
    opacity: 1;
  }

  45% {
    transform: translate(-50%, -50%);
    opacity: 1;
  }

  55% {
    transform: translate(-50%, -50%);
    opacity: 1;
  }

  100% {
    transform: translate(-50%, -40%);
    opacity: 0;
  }
`;

const NoSpacing = styled.span`
  letter-spacing: -5rem;
`;

const Text = styled.p`
  font-family: "Arcade Classic";
  /* figure out how to scale this to display size... */
  font-size: 20rem;
  color: white;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ${PopInDropOut} 1s both;
  z-index: ${zIndex1};
  pointer-events: none;
`;

export default TimerDisplay;
