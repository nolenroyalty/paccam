import React from "react";
import { motion } from "framer-motion";
import styled from "styled-components";
import { COLORS } from "../../COLORS";

function TranslucentWindow({ children, ...rest }, ref) {
  return (
    <Wrapper ref={ref} {...rest}>
      {children}
    </Wrapper>
  );
}

const Wrapper = styled(motion.div)`
  border: 2px solid ${COLORS.white};
  backdrop-filter: blur(20px) contrast(0.4);
  -webkit-backdrop-filter: blur(20px) contrast(0.4);
  box-shadow: 4px 4px 8px 2px rgba(0, 0, 0, 0.3);

  scrollbar-color: lightgrey transparent;
  scrollbar-width: thin;
  overflow: auto;
`;

export default React.forwardRef(TranslucentWindow);
