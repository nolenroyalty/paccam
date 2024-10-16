import React from "react";
import { zIndex1 } from "../../zindex";
import styled from "styled-components";
import { COLORS } from "../../COLORS";

function TutorialHandler({ tutorialInstruction }) {
  if (!tutorialInstruction || tutorialInstruction.length === 0) {
    return null;
  }
  return <Instructions>{tutorialInstruction.join(" ")}</Instructions>;
}

export default React.memo(TutorialHandler);

const Instructions = styled.h2`
  color: ${COLORS.white};
  font-family: "Arcade Classic";
  font-size: 4rem;
  word-spacing: 1rem;
  position: absolute;
  white-space: nowrap;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${zIndex1};
  /* pointer-events: none; */
`;
