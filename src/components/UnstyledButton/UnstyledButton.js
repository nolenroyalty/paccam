import React from "react";
import styled from "styled-components";

const UnstyledButton = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <Button ref={ref} {...props}>
      {children}
    </Button>
  );
});

const Button = styled.button`
  background-color: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
`;

export default UnstyledButton;
