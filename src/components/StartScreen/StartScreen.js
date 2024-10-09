import React from "react";
import styled from "styled-components";
import Button from "../Button";
import { zIndex1 } from "../../zindex";
import {
  WAITING_FOR_PLAYER_SELECT,
  WAITING_TO_START_ROUND,
} from "../../STATUS";
import * as Checkbox from "@radix-ui/react-checkbox";

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
      <ButtonWrapper disabled={disabled} onClick={onClick(1)} size="small">
        1 &nbsp;Player
      </ButtonWrapper>
      <ButtonWrapper disabled={disabled} onClick={onClick(2)} size="small">
        2 &nbsp;Players
      </ButtonWrapper>
      <ButtonWrapper disabled={disabled} onClick={onClick(3)} size="small">
        3 &nbsp;Players
      </ButtonWrapper>
      <ButtonWrapper disabled={disabled} onClick={onClick(4)} size="small">
        4 &nbsp;Players
      </ButtonWrapper>
    </PlayerSelectWrapper>
  );
}

const MAX_PLAYERS = 4;

function StartScreen({ status, startGame, setNumPlayers }) {
  const [numCPUs, setNumCPUs] = React.useState(0);
  const [numHumans, setNumHumans] = React.useState(0);

  const checkNumHumans = React.useCallback(
    (numHumans) => {
      if (numHumans + numCPUs > MAX_PLAYERS) {
        setNumCPUs(MAX_PLAYERS - numHumans);
      }
      setNumHumans(numHumans);
    },
    [numCPUs]
  );

  const checkNumCPUs = React.useCallback(
    (numCPUs) => {
      if (numHumans + numCPUs > MAX_PLAYERS) {
        setNumHumans(MAX_PLAYERS - numCPUs);
      }
      setNumCPUs(numCPUs);
    },
    [numHumans]
  );

  if (
    status !== WAITING_FOR_PLAYER_SELECT &&
    status !== WAITING_TO_START_ROUND
  ) {
    return null;
  }

  return (
    <Wrapper>
      <Title>PacCam</Title>
      {/* <PlayerSelect
        disabled={status !== WAITING_FOR_PLAYER_SELECT}
        setNumPlayers={setNumPlayers}
      /> */}

      <StartGameButton
        onClick={(e) => {
          startGame();
        }}
        // disabled={status !== WAITING_TO_START_ROUND}
        size="medium"
      >
        Start Game
      </StartGameButton>
      <CheckboxContainer
        label="Human Players"
        numBoxes={4}
        onCheck={checkNumHumans}
        numCPUs={numHumans}
      />
      <CheckboxContainer
        label="CPU Players"
        numBoxes={4}
        onCheck={checkNumCPUs}
        numCPUs={numCPUs}
      />
    </Wrapper>
  );
}

function CheckboxContainer({ numCPUs, label, numBoxes, onCheck }) {
  return (
    <CheckboxContainerWrapper>
      <CheckboxContainerLabel>{label}</CheckboxContainerLabel>
      {[...Array(numBoxes)].map((_, i) => (
        <SingleCheckbox
          key={i}
          myCheckCount={i + 1}
          checkCount={numCPUs}
          onCheck={onCheck}
        />
      ))}
    </CheckboxContainerWrapper>
  );
}

const CheckboxContainerWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  pointer-events: auto;
  align-items: center;
`;

const CheckboxContainerLabel = styled.span`
  font-size: 1.5rem;
  font-family: "Arcade Classic";
  color: white;
`;

function SingleCheckbox({ checkCount, myCheckCount, onCheck }) {
  const onCheckedChange = React.useCallback(
    (e) => {
      if (checkCount >= myCheckCount) {
        onCheck(myCheckCount - 1);
      } else {
        onCheck(myCheckCount);
      }
    },
    [checkCount, myCheckCount, onCheck]
  );
  return (
    <CheckboxRoot
      checked={checkCount >= myCheckCount}
      onCheckedChange={onCheckedChange}
    ></CheckboxRoot>
  );
}

const CheckboxRoot = styled(Checkbox.Root)`
  all: unset;
  width: 24px;
  height: 24px;
  background-color: white;
  pointer-events: auto;

  &:hover {
    background-color: lightgray;
  }

  &:active,
  &:focus {
    outline: 2px solid grey;
  }

  &[data-state="checked"] {
    background-color: yellow;
  }
`;

const Wrapper = styled.div`
  position: absolute;
  display: grid;
  width: 50%;
  left: 50%;
  top: 0%;
  transform: translateX(-50%);
  gap: 2rem;
  z-index: ${zIndex1};
  grid-template-areas:
    "title title"
    "players cpus"
    "start start";
  pointer-events: var(--pointer-events);
`;

const Title = styled.h2`
  grid-area: title;
  font-size: 4rem;
  text-align: center;
  font-family: "Arcade Classic";
`;

const PlayerSelectWrapper = styled.div`
  display: flex;
  /* position: absolute; */
  /* top: 50%; */
  /* left: 50%; */
  /* transform: translate(-50%, -50%); */
  flex-direction: column;
  gap: 2rem;
  opacity: ${(props) => (props.$disabled ? 0 : 1)};
  transition: opacity 0.2s ease-out;
  grid-area: players;
`;

const CPUSelectWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 2rem;
  grid-area: cpus;
`;

const ButtonWrapper = styled(Button)`
  pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
`;

const StartGameButton = styled(Button)`
  /* position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); */
  opacity: ${(props) => (props.disabled ? 0 : 1)};
  pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
  transition: opacity 0.5s ease-out;
  grid-area: start;
  width: fit-content;
  justify-self: right;
`;

export default StartScreen;
