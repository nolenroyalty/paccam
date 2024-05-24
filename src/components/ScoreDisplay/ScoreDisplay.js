import React from "react";
import styled, { keyframes } from "styled-components";

function ScoreDisplay({ numPlayers, gameRef }) {
  const [scores, setScores] = React.useState(null);

  React.useEffect(() => {
    gameRef.current.subscribeToScores(setScores);
  }, [gameRef]);

  const scoreForPlayer = React.useCallback(
    (index) => {
      return scores
        ? scores.find((score) => score.playerNum === index)?.score
        : null;
    },
    [scores]
  );

  const p1Score = scoreForPlayer(0);
  const p2Score = scoreForPlayer(1);
  const p3Score = scoreForPlayer(2);
  const p4Score = scoreForPlayer(3);

  return (
    <Wrapper>
      {numPlayers >= 1 && (
        <Player1 $noAnimation={p1Score === 0} key={p1Score}>
          {p1Score}
        </Player1>
      )}
      {numPlayers >= 2 && (
        <Player2 $noAnimation={p2Score === 0} key={p2Score}>
          {p2Score}
        </Player2>
      )}
      {numPlayers >= 3 && (
        <Player3 $noAnimation={p3Score === 0} key={p3Score}>
          {p3Score}
        </Player3>
      )}
      {numPlayers >= 4 && (
        <Player4 $noAnimation={p4Score === 0} key={p4Score}>
          {p4Score}
        </Player4>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  grid-template-areas:
    "p1 p2"
    "p3 p4";

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
  color: white;
  font-size: 8rem;
  line-height: 0;
  font-family: "Arcade Classic";
  margin: 0;

  --jump-amount: ${(p) => (p.$noAnimation ? "0" : "1rem")};
  animation: ${ScorePulse} 0.4s ease-out;
`;

const Player1 = styled(ScoreText)`
  color: yellow;
  justify-self: flex-start;
  align-self: flex-start;
  grid-area: p1;
`;

const Player2 = styled(ScoreText)`
  color: pink;
  justify-self: flex-end;
  align-self: flex-start;
  grid-area: p2;
`;

const Player3 = styled(ScoreText)`
  color: green;
  justify-self: flex-start;
  align-self: flex-end;
  grid-area: p3;
`;

const Player4 = styled(ScoreText)`
  color: red;
  align-self: flex-end;
  justify-self: flex-end;
  grid-area: p4;
`;

export default ScoreDisplay;
