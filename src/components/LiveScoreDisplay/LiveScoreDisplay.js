import React from "react";
import styled from "styled-components";
import { COLORS } from "../../COLORS";
import { motion } from "framer-motion";
import {
  COUNTING_IN_ROUND,
  RUNNING_ROUND,
  COMPLETED_ROUND,
} from "../../STATUS";

function LiveScoreDisplay({ status, scores, totalPlayers }) {
  let startOpacity, endOpacity;
  if (status === COUNTING_IN_ROUND) {
    startOpacity = 0;
    endOpacity = 1;
  } else if (status === RUNNING_ROUND) {
    startOpacity = 1;
    endOpacity = 1;
  } else if (status === COMPLETED_ROUND) {
    startOpacity = 1;
    endOpacity = 0;
  } else {
    return null;
  }
  return (
    <Wrapper
      initial={{ opacity: startOpacity }}
      animate={{ opacity: endOpacity }}
      transition={{ duration: 0.5 }}
    >
      <ScoreRow>
        <ScoreBlock
          playerNum={0}
          totalPlayers={totalPlayers}
          color={COLORS.pacmanYellow}
          scores={scores}
        />
        <ScoreBlock
          playerNum={1}
          totalPlayers={totalPlayers}
          color={COLORS.pacmanPink}
          scores={scores}
        />
      </ScoreRow>
      <ScoreRow>
        <ScoreBlock
          playerNum={2}
          totalPlayers={totalPlayers}
          color={COLORS.pacmanGreen}
          scores={scores}
        />
        <ScoreBlock
          playerNum={3}
          totalPlayers={totalPlayers}
          color={COLORS.pacmanOrange}
          scores={scores}
        />
      </ScoreRow>
    </Wrapper>
  );
}

const ScoreBlock = ({ playerNum, totalPlayers, color, scores }) => {
  if (playerNum >= totalPlayers) {
    return null;
  }

  return (
    <Score
      key={scores[playerNum].score}
      animate={{ y: [-6, 0] }}
      transition={{ type: "spring", stiffness: 100, damping: 10 }}
      initial={false}
      style={{ "--color": color }}
    >
      {scores[playerNum].score}
    </Score>
  );
};

const Wrapper = styled(motion.div)`
  position: absolute;
  inset: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const ScoreRow = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
`;

const Score = styled(motion.span)`
  color: var(--color);
  font-size: 6rem;
  font-family: "Arcade Classic";
  padding: 0.5rem 1rem;
  line-height: 1;
`;

export default LiveScoreDisplay;
