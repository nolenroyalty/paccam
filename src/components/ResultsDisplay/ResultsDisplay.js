import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { colorForPlayer } from "../../utils";
import { SHOWING_RESULTS } from "../../STATUS";
import Button from "../Button";
import { MAX_PLAYERS } from "../../constants";
import ImageToVideoConverter from "../../ImageToVideoConverter";

function ResultsDisplay({
  totalPlayers,
  pacmanFaceGifState,
  status,
  gameRef,
  moveToWaitingForPlayerSelect,
}) {
  // const [z, setZ] = React.useState(0);
  const [swapResultsAround, setSwapResultsAround] = React.useState(false);
  const [fadeOut, setFadeOut] = React.useState(false);
  const [scores, setScores] = React.useState({});
  const [gifs, setGifs] = React.useState({});
  const id = React.useId();
  React.useEffect(() => {
    const game = gameRef.current;
    game.subscribeToScores({ id, callback: setScores });
    return () => {
      game.unsubscribeFromScores({ id });
    };
  }, [gameRef, id]);

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
  }, [status]);

  const fadeOutAndMoveToPlayerSelect = React.useCallback(() => {
    if (!fadeOut) {
      setFadeOut(true);
      setTimeout(() => {
        moveToWaitingForPlayerSelect();
      }, 200);
    }
  }, [fadeOut, moveToWaitingForPlayerSelect]);

  const genGifs = React.useRef(false);
  React.useEffect(() => {
    if (status !== SHOWING_RESULTS) {
      genGifs.current = true;
      return;
    }
    if (!genGifs.current) {
      return;
    }
    genGifs.current = false;

    const converter = new ImageToVideoConverter();
    for (let i = 0; i < totalPlayers; i++) {
      const state = pacmanFaceGifState["player" + i];
      const beforeMain = state.framesBeforeMain;
      const afterMain = state.framesAfterMain;
      if (beforeMain.length + afterMain.length === 0) {
        continue;
      }
      const main = state.mainMouthFrame;
      const frames = [...beforeMain, main, ...afterMain];
      const appendLastFrame = (n) => {
        for (let i = 0; i < n; i++) {
          frames.push(frames.slice(-1)[0]);
        }
      };
      // make the gif "stop" for a bit before looping
      appendLastFrame(3);

      console.log(`GEN GIF: ${i} / length: ${state.length}`);
      converter
        .createGif(frames, { delay: 200 })
        .catch((e) => {
          console.error(`GIF ERROR: ${e}`);
        })
        .then((gif) => {
          console.log(`SET GIFS: ${gif}`);
          const url = URL.createObjectURL(gif);
          setGifs((gifs) => ({ ...gifs, [i]: url }));
        });
    }
  }, [pacmanFaceGifState, status, totalPlayers]);

  if (status !== SHOWING_RESULTS) {
    return null;
  }

  return (
    <Wrapper style={{ "--opacity": fadeOut ? 0 : 1 }}>
      {Array.from({ length: MAX_PLAYERS }, (_, i) => {
        if (i < totalPlayers) {
          let whatToDisplay;
          if (gifs[i]) {
            whatToDisplay = gifs[i];
          } else {
            whatToDisplay =
              pacmanFaceGifState["player" + i].pngToDisplayBeforeGifIsReady;
          }

          return (
            <ScoreBlock
              key={i}
              myResultScreenState={whatToDisplay}
              color={colorForPlayer(i)}
              myScore={scores[i].score}
              myPlayerNum={i}
              swapResultsAround={swapResultsAround}
              scores={scores}
              totalPlayers={totalPlayers}
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
  totalPlayers,
  myPlayerNum,
  myResultScreenState,
  color,
  myScore,
  swapResultsAround,
  scores,
}) {
  const face = Boolean(myResultScreenState) ? myResultScreenState : null;

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
