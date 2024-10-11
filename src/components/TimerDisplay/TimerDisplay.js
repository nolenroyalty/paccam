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
  // I was originally using 20rem all the time, but this is way too big on smaller screens
  // To back this value out, I set the screen to 850 px wide and found a font size that looked
  // ok and didn't produce values larger than the screen for the string "FINISH", which is the
  // longest string that can we display. That turned out to be 28vw. SO we just use that (which will
  // never be larger than the screen width, and cap it at 20rem because that's a nice value.
  font-size: min(28vw, 20rem);
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
