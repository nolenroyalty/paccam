import React from "react";
import styled from "styled-components";
import UnstyledButton from "../UnstyledButton";

function Button({ children, style = {}, size, disabled, ...props }) {
  let borderPx;
  let padding;
  let fontSize;
  if (size === "small") {
    borderPx = 2;
    padding = "1rem 0.25rem";
    fontSize = "1.5rem";
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
    <Wrapper style={style} disabled={disabled} {...props}>
      {children}
    </Wrapper>
  );
}

const Wrapper = styled(UnstyledButton)`
  /* border: var(--border-size) dashed yellow; */
  color: ${(p) => (p.disabled ? "lightgrey" : "white")};
  font-family: "Arcade Classic";
  white-space: pre-wrap;
  border-radius: var(--border-size);
  font-size: var(--font-size);
  background-color: ${(p) => (p.disabled ? "darkgrey" : "black")};
  pointer-events: ${(p) => (p.disabled ? "none" : "auto")};
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    opacity 1s ease;
  padding: var(--padding);

  &:hover {
    background-color: ${(p) => (p.disabled ? "darkgrey" : "white")};
    color: ${(p) => (p.disabled ? "lightgrey" : "black")};
    /* border: var(--border-size) dashed white; */
  }
`;

export default Button;
