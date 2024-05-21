import React from "react";
import styled from "styled-components";

function UnstyledButton({ children, ...props }) {
  return <Button {...props}>{children}</Button>;
}

const Button = styled.button`
  background-color: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
`;

export default UnstyledButton;
