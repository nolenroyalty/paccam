import React from "react";
import styled from "styled-components";
import UnstyledButton from "../UnstyledButton";
import { COLORS } from "../../COLORS";

const Button = React.forwardRef(
  ({ children, style = {}, size, disabled, ...props }, ref) => {
    let borderPx;
    let padding;
    let fontSize;
    if (size === "small") {
      borderPx = 4;
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
      <Wrapper style={style} disabled={disabled} {...props} ref={ref}>
        {children}
      </Wrapper>
    );
  }
);

const Wrapper = styled(UnstyledButton)`
  /* border: var(--border-size) dashed yellow; */
  color: ${(p) => (p.disabled ? "lightgrey" : COLORS.white)};
  font-family: "Arcade Classic";
  white-space: pre-wrap;
  word-spacing: 0.2rem;
  border-radius: var(--border-size);
  font-size: var(--font-size);
  background-color: ${(p) => (p.disabled ? "darkgrey" : COLORS.black)};
  pointer-events: ${(p) => (p.disabled ? "none" : "auto")};
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    opacity 1s ease;
  padding: var(--padding);

  &:hover {
    background-color: ${(p) => (p.disabled ? "darkgrey" : COLORS.white)};
    color: ${(p) => (p.disabled ? "lightgrey" : COLORS.black)};
  }
`;

export default Button;
