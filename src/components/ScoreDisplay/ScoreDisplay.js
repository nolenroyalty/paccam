import React from "react";
import styled, { keyframes } from "styled-components";
import {
  SHOWING_RESULTS,
  COMPLETED_ROUND,
  RUNNING_TUTORIAL,
} from "../../STATUS";
import { PLAYER_SIZE_IN_SLOTS } from "../../constants";
import { COLORS } from "../../COLORS";
import Button from "../Button";

/* The original intention here was to animate the score text and pacman faces
so that they go directly from their location on the playfield to their
location on the results screen. I couldn't figure out how to do it;
framer motion defeated me. Eventually I will tho. */

/* We should totaly move away from the "havestate" check here and should simply
   display things based on the round being over. */

function PlayerResultsBlob({
  pacmanResultScreenState,
  x,
  y,
  playerNum,
  color,
  justifyContent,
  alignSelf,
  slotSizePx,
  scores,
  status,
}) {
  const playerState = pacmanResultScreenState[`player${playerNum}`];
  const haveState = Boolean(playerState);
  const roundOver = status === SHOWING_RESULTS || status === COMPLETED_ROUND;
  const showResults = roundOver && haveState;
  const faceCapture = haveState ? playerState.faceCapture : null;
  const scoreForPlayer = React.useCallback(
    (index) => {
      return scores
        ? scores.find((score) => score.playerNum === index)?.score
        : null;
    },
    [scores]
  );
  const score = scoreForPlayer(playerNum);

  let finalOffset;
  if (showResults && scores) {
    const scoresGreaterThanMine = scores.filter((score) => {
      const isMe = score.playerNum === playerNum;
      const isGreater = score.score > scoreForPlayer(playerNum);
      const isEqual = score.score === scoreForPlayer(playerNum);
      const isEqualAndBefore = score.playerNum < playerNum && isEqual;
      return !isMe && (isGreater || isEqualAndBefore);
    }).length;
    finalOffset = (scoresGreaterThanMine - playerNum) * 100 + "%";
  }

  return (
    <>
      {showResults ? (
        <PlayerResultsDisplay
          style={{
            "--grid-area": `result${playerNum + 1}`,
            "--x": x,
            "--y": y,
            "--final-offset": finalOffset,
          }}
        >
          <PlayerFace
            style={{ "--width": slotSizePx * PLAYER_SIZE_IN_SLOTS + "px" }}
            src={faceCapture}
          />
          <ScoreText style={{ "--color": color }}>{score}</ScoreText>
        </PlayerResultsDisplay>
      ) : null}
      <PlayerScoreDisplay
        style={{
          "--opacity": showResults ? 0 : 1,
          "--justify-content": justifyContent,
          "--align-self": alignSelf,
          "--grid-area": `p${playerNum + 1}`,
        }}
      >
        <ScoreText
          $noAnimation={score === 0 || showResults}
          style={{ "--color": color }}
        >
          {score}
        </ScoreText>
      </PlayerScoreDisplay>
    </>
  );
}

function ScoreDisplay({
  numPlayers,
  gameRef,
  pacmanResultScreenState,
  slotSizePx,
  status,
  moveToWaitingForPlayerSelect,
}) {
  const [scores, setScores] = React.useState(null);

  React.useEffect(() => {
    gameRef.current.subscribeToScores(setScores);
  }, [gameRef]);

  if (status === RUNNING_TUTORIAL) {
    return null;
  }

  return (
    <Wrapper>
      {numPlayers >= 1 && (
        <PlayerResultsBlob
          pacmanResultScreenState={pacmanResultScreenState}
          x={"0"}
          y={"-100%"}
          playerNum={0}
          color={COLORS.pacmanYellow}
          justifyContent={"flex-start"}
          alignSelf={"flex-start"}
          slotSizePx={slotSizePx}
          scores={scores}
          status={status}
        />
      )}
      {numPlayers >= 2 && (
        <PlayerResultsBlob
          pacmanResultScreenState={pacmanResultScreenState}
          x={"-100%"}
          y={"0"}
          playerNum={1}
          color={COLORS.pacmanPink}
          justifyContent={"flex-end"}
          alignSelf={"flex-start"}
          slotSizePx={slotSizePx}
          scores={scores}
          status={status}
        />
      )}
      {numPlayers >= 3 && (
        <PlayerResultsBlob
          pacmanResultScreenState={pacmanResultScreenState}
          x={"100%"}
          y={"0"}
          playerNum={2}
          color={COLORS.pacmanGreen}
          justifyContent={"flex-start"}
          alignSelf={"flex-end"}
          slotSizePx={slotSizePx}
          scores={scores}
          status={status}
        />
      )}
      {numPlayers >= 4 && (
        <PlayerResultsBlob
          pacmanResultScreenState={pacmanResultScreenState}
          x={"-100%"}
          y={"0"}
          playerNum={3}
          color={COLORS.pacmanOrange}
          justifyContent={"flex-end"}
          alignSelf={"flex-end"}
          slotSizePx={slotSizePx}
          scores={scores}
          status={status}
        />
      )}
      {(status === SHOWING_RESULTS || status === COMPLETED_ROUND) && (
        <RestartButton
          style={{ "--opacity": status === SHOWING_RESULTS ? 1 : 0 }}
          onClick={moveToWaitingForPlayerSelect}
          size="large"
        >
          Play Again
        </RestartButton>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(4, 1fr);
  grid-template-areas:
    "p1 result1 p2"
    "p1 result2 p2"
    "p3 result3 p4"
    "p3 result4 p4"
    "p3 restart p4";
  position: absolute;
  top: 0;
  right: 0;
  padding: 6rem 2rem;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const ScorePulse = keyframes`
  0% {
    transform: revert;
  }

  10% {
    transform: translateY(calc(var(--jump-amount) * -0.5));
  }

  60% {
    transform: translateY(var(--jump-amount));
  }

  100% {
    transform: revert;
  }
`;

const ScoreText = styled.p`
  font-size: 8rem;
  line-height: 0;
  font-family: "Arcade Classic";
  margin: 0;

  --jump-amount: ${(p) => (p.$noAnimation ? "0" : "1rem")};
  animation: ${ScorePulse} 0.4s ease-out;
  color: var(--color);
`;

const PlayerFace = styled.img`
  width: min(min(20vh, 20vw), var(--width));
  aspect-ratio: 1/1;
`;

const PlayerScoreDisplay = styled.div`
  display: flex;
  width: 100%;

  opacity: var(--opacity);
  transition: opacity 0.5s ease-out;
  justify-content: var(--justify-content);
  align-self: var(--align-self);
  grid-area: var(--grid-area);
`;

const RestartButton = styled(Button)`
  grid-area: restart;
  opacity: var(--opacity);
  transition: opacity 1s ease-out;
  justify-self: center;
  align-self: center;
  pointer-events: auto;
`;

const FadeAndDropIn = keyframes`
  0% {
    opacity: 0;
    transform: translate(var(--x), var(--y));
  }

  40% {
    opacity: 1;
    transform: translate(0, 0);
  }

  70% {
    opacity: 1;
    transform: translate(0, 0);
  }

  100% {
    opacity: 1;
    transform: translate(0, var(--final-offset));
  }
`;

const PlayerResultsDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-self: center;
  grid-area: var(--grid-area);
  /* height 100% makes the finalOffset trick work */
  height: 100%;
  animation: ${FadeAndDropIn} 2s ease-out both 1s;
`;

export default ScoreDisplay;
