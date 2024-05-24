import React from "react";
import styled from "styled-components";
import Button from "../Button";
import { zIndex1 } from "../../zindex";
import {
  WAITING_FOR_PLAYER_SELECT,
  WAITING_TO_START_ROUND,
} from "../../STATUS";

function PlayerSelect({ disabled, setNumPlayers }) {
  const onClick = React.useCallback(
    (numPlayers) => {
      return (e) => {
        console.log(`set num players to ${numPlayers}`);
        e.preventDefault();
        setNumPlayers(numPlayers);
      };
    },
    [setNumPlayers]
  );

  return (
    <PlayerSelectWrapper $disabled={disabled}>
      <ButtonWrapper disabled={disabled} onClick={onClick(1)} size="medium">
        1 &nbsp;Player
      </ButtonWrapper>
      <ButtonWrapper disabled={disabled} onClick={onClick(2)} size="medium">
        2 &nbsp;Players
      </ButtonWrapper>
      <ButtonWrapper disabled={disabled} onClick={onClick(3)} size="medium">
        3 &nbsp;Players
      </ButtonWrapper>
      <ButtonWrapper disabled={disabled} onClick={onClick(4)} size="medium">
        4 &nbsp;Players
      </ButtonWrapper>
    </PlayerSelectWrapper>
  );
}

function StartScreen({ status, startGame, setNumPlayers }) {
  return (
    <Wrapper
      style={{
        "--pointer-events":
          status === WAITING_FOR_PLAYER_SELECT ||
          status === WAITING_TO_START_ROUND
            ? "auto"
            : "none",
      }}
    >
      <PlayerSelect
        disabled={status !== WAITING_FOR_PLAYER_SELECT}
        setNumPlayers={setNumPlayers}
      />

      <StartGameButton
        onClick={(e) => {
          startGame();
        }}
        disabled={status !== WAITING_TO_START_ROUND}
        size="large"
      >
        Start Game
      </StartGameButton>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: ${zIndex1};
  pointer-events: var(--pointer-events);
`;

const PlayerSelectWrapper = styled.div`
  display: flex;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  flex-direction: column;
  gap: 2rem;
  opacity: ${(props) => (props.$disabled ? 0 : 1)};
  transition: opacity 0.2s ease-out;
`;

const ButtonWrapper = styled(Button)`
  pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
`;

const StartGameButton = styled(Button)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: ${(props) => (props.disabled ? 0 : 1)};
  pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
  transition: opacity 0.5s ease-out;
`;

export default StartScreen;
