import React from "react";
import styled from "styled-components";
import TranslucentWindow from "../TranslucentWindow";
import { motion } from "framer-motion";
import { colorForPlayer } from "../../utils";
import { COMPLETED_ROUND, SHOWING_RESULTS } from "../../STATUS";
import { COLORS } from "../../COLORS";
import Button from "../Button";
import { MAX_PLAYERS } from "../../constants";

function ResultsDisplay({
  numPlayers,
  scores,
  resultScreenState,
  status,
  moveToWaitingForPlayerSelect,
}) {
  const [z, setZ] = React.useState(0);
  const [swapResultsAround, setSwapResultsAround] = React.useState(false);
  const [fadeOut, setFadeOut] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyL" && e.altKey) {
        setSwapResultsAround(false);
        setZ((z) => z + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  React.useEffect(() => {
    let timeoutId;
    if (status !== SHOWING_RESULTS) {
      setSwapResultsAround(false);
      setFadeOut(false);
    } else {
      timeoutId = setTimeout(() => {
        setSwapResultsAround(true);
      }, 2000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [status, z]);

  const fadeOutAndMoveToPlayerSelect = React.useCallback(() => {
    if (!fadeOut) {
      setFadeOut(true);
      setTimeout(() => {
        moveToWaitingForPlayerSelect();
      }, 200);
    }
  }, [fadeOut, moveToWaitingForPlayerSelect]);

  if (z % 2 === 1) {
    return null;
  }

  if (status !== SHOWING_RESULTS) {
    return null;
  }

  return (
    <Wrapper style={{ "--opacity": fadeOut ? 0 : 1 }}>
      {Array.from({ length: MAX_PLAYERS }, (_, i) => {
        if (i < numPlayers) {
          return (
            <ScoreBlock
              key={i}
              myResultScreenState={resultScreenState["player" + i]}
              color={colorForPlayer(i)}
              myScore={scores[i].score}
              myPlayerNum={i}
              swapResultsAround={swapResultsAround}
              scores={scores}
              numPlayers={numPlayers}
            />
          );
        } else {
          return <ScoreSpacer key={i} />;
        }
      })}
      <ButtonWrapper
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ease: "ease", duration: 0.7, delay: 1.1 }}
      >
        <Button
          onClick={fadeOutAndMoveToPlayerSelect}
          disabled={fadeOut}
          size="medium"
        >
          Play Again
        </Button>
      </ButtonWrapper>
    </Wrapper>
  );
}

function ScoreBlock({
  numPlayers,
  myPlayerNum,
  myResultScreenState,
  color,
  myScore,
  swapResultsAround,
  scores,
}) {
  const face = Boolean(myResultScreenState)
    ? myResultScreenState.faceCapture
    : null;

  let initialY, finalY, delay, spring;
  if (swapResultsAround) {
    const scoresGreaterThanMine = Object.values(scores).filter(
      (otherPlayer) => {
        const isMe = otherPlayer.playerNum === myPlayerNum;
        const isGreater = otherPlayer.score > myScore;
        const isEqual = myScore === otherPlayer.score;
        const isEqualAndBefore = otherPlayer.playerNum < myPlayerNum && isEqual;
        return !isMe && (isGreater || isEqualAndBefore);
      }
    ).length;

    // forgive me for this lmao

    const totalHeight = window.innerHeight * 0.95 - 32;
    const hardcodedButtonHeightPleaseDontMurderMe = 120;
    const availableHeight =
      totalHeight - hardcodedButtonHeightPleaseDontMurderMe;
    const individualHeight = availableHeight / MAX_PLAYERS;
    initialY = 0;
    finalY = (scoresGreaterThanMine - myPlayerNum) * individualHeight;
    spring = { type: "spring", stiffness: 40, damping: 12, delay: 0 };
  } else {
    const extra = 4 - myPlayerNum - 1;
    initialY = -110 - extra * 20 + "vh";
    finalY = 0;
    spring = {
      type: "spring",
      stiffness: 75,
      damping: 10,
      delay: myPlayerNum * 0.15,
    };
  }

  return (
    <ScoreRow
      initial={{ y: initialY }}
      animate={{ y: finalY }}
      transition={spring}
    >
      <PlayerFace src={face} />
      <ScoreText style={{ "--color": color }}>{myScore}</ScoreText>
    </ScoreRow>
  );
}

const ButtonWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
`;

const PlayerFace = styled.img`
  height: 100%;
  aspect-ratio: 1/1;
`;

const Wrapper = styled(motion.div)`
  display: flex;
  padding: 1rem;
  border-radius: 20px;
  flex-direction: column;
  gap: 1rem;
  left: 50%;
  top: 3%;
  height: 95%;
  transform: translate(-50%);
  width: min(500px, 95%);
  justify-content: space-between;
  position: absolute;
  transition: opacity 0.15s ease-out;
  opacity: var(--opacity);
`;

const ScoreRow = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
  height: 17%;
`;

const ScoreSpacer = styled.div`
  height: 17%;
`;

const ScoreText = styled.p`
  font-size: clamp(4rem, max(10vh, 10vw), 8rem);
  font-family: "Arcade Classic";
  color: var(--color);
  line-height: 0.6;
`;

export default ResultsDisplay;
