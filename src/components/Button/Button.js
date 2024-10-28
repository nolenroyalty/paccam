import React from "react";
import styled from "styled-components";
import UnstyledButton from "../UnstyledButton";
import { COLORS } from "../../COLORS";

const Button = React.forwardRef(
  (
    {
      children,
      style = {},
      size,
      disabled,
      transitionDelay = "0s",
      overrideTransitionSpeed = null,
      ...props
    },
    ref
  ) => {
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
      "--transition-delay": transitionDelay,
      "--background-color-trans-speed": overrideTransitionSpeed || "0.25s",
      "--color-trans-speed": overrideTransitionSpeed || "0.25s",
      "--opacity-trans-speed": overrideTransitionSpeed || "1s",
    };

    return (
      <Wrapper style={style} disabled={disabled} {...props} ref={ref}>
        {children}
      </Wrapper>
    );
  }
);

const Wrapper = styled(UnstyledButton)`
  color: ${(p) => (p.disabled ? "lightgrey" : COLORS.white)};
  font-family: "Arcade Classic";
  white-space: pre-wrap;
  word-spacing: 0.2rem;
  border-radius: var(--border-size);
  font-size: var(--font-size);
  background-color: ${(p) => (p.disabled ? COLORS.grey : COLORS.black)};
  pointer-events: ${(p) => (p.disabled ? "none" : "auto")};
  opacity: ${(p) => (p.disabled ? 0.1 : 1)};
  transition:
    background-color var(--background-color-trans-speed) ease
      var(--transition-delay),
    color var(--color-trans-speed) ease var(--transition-delay),
    opacity var(--opacity-trans-speed) ease var(--transition-delay);
  padding: var(--padding);

  &:hover {
    background-color: ${(p) => (p.disabled ? COLORS.grey : COLORS.white)};
    color: ${(p) => (p.disabled ? "lightgrey" : COLORS.black)};
  }
`;

export default Button;
