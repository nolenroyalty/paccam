import React from "react";
import { zIndex1 } from "../../zindex";
import styled from "styled-components";
import { COLORS } from "../../COLORS";

function TutorialHandler({ tutorialInstruction }) {
  if (!tutorialInstruction || tutorialInstruction.length === 0) {
    return null;
  }
  const interspersed = tutorialInstruction.flatMap((instruction, index) =>
    index === tutorialInstruction.length - 1
      ? instruction
      : [
          <span key={index * 2}>{instruction}</span>,
          <NBSPer key={index * 2 + 1} />,
        ]
  );
  return <Instructions>{interspersed}</Instructions>;
}

export default React.memo(TutorialHandler);

// kerning with our font is insane, so we do this.
const NBSPer = () => {
  return <span>&nbsp;&nbsp;&nbsp;</span>;
};

const Instructions = styled.h2`
  color: ${COLORS.white};
  font-family: "Arcade Classic";
  font-size: 4rem;
  position: absolute;
  white-space: nowrap;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${zIndex1};
  /* pointer-events: none; */
`;
