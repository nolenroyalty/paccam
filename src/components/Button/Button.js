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
    borderPx = 8;
    padding = "1.5rem";
    fontSize = "3rem";
  } else if (size === "large") {
    borderPx = 8;
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
  /* border: var(--border-size) dashed black; */
  color: white;
  font-family: "Arcade Classic";
  white-space: pre-wrap;
  border-radius: var(--border-size);
  font-size: var(--font-size);
  background-color: black;
  transition:
    background-color 0.2s,
    color 0.2s;
  padding: var(--padding);

  &:hover {
    background-color: white;
    color: black;
  }
`;

export default Button;
