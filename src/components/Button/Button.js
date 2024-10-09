import React from "react";
import styled from "styled-components";
import UnstyledButton from "../UnstyledButton";

function Button({ children, style = {}, size, ...props }) {
  let borderPx;
  let padding;
  let fontSize;
  if (size === "small") {
    borderPx = 2;
    padding = "1rem";
    fontSize = "2rem";
  } else if (size === "medium") {
    borderPx = 4;
    padding = "1.5rem";
    fontSize = "3rem";
  } else if (size === "large") {
    borderPx = 4;
    padding = "2rem";
    fontSize = "3rem";
  } else {
    throw new Error(`Invalid border size: ${size}`);
  }

  style = {
    ...style,
    "--border-size": borderPx + "px",
    "--padding": padding,
    "--font-size": fontSize,
  };

  return (
    <Wrapper style={style} {...props}>
      {children}
    </Wrapper>
  );
}

const Wrapper = styled(UnstyledButton)`
  /* border: var(--border-size) dashed yellow; */
  color: white;
  font-family: "Arcade Classic";
  white-space: pre-wrap;
  border-radius: var(--border-size);
  font-size: var(--font-size);
  background-color: black;
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    opacity 1s ease;
  padding: var(--padding);

  &:hover {
    background-color: white;
    color: black;
    /* border: var(--border-size) dashed white; */
  }
`;

export default Button;
