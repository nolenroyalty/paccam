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
  const [allowMorePlayers, setAllowMorePlayers] = React.useState(false);
  const [speculativelyHighlighted, _setSpeculativelyHighlighted] =
    React.useState({ CPUs: null, Humans: null });

  const setSpeculativelyHighlighted = React.useCallback(
    ({ count, kind }) => {
      if (kind === "CPUs") {
        const humans = Math.min(MAX_PLAYERS - count, numHumans);
        const cpus = count < numCPUs ? count - 1 : count;
        console.log(`setting speculatively highlighted to ${count} ${kind}`);
        console.log(`cpus: ${cpus}, humans: ${humans}`);
        _setSpeculativelyHighlighted({ CPUs: cpus, Humans: humans });
      } else if (kind === "Humans") {
        const cpus = Math.min(MAX_PLAYERS - count, numCPUs);
        const humans = count < numHumans ? count - 1 : count;
        console.log(`setting speculatively highlighted to ${count} ${kind}`);
        console.log(`cpus: ${cpus}, humans: ${humans}`);
        _setSpeculativelyHighlighted({ CPUs: cpus, Humans: humans });
      } else {
        _setSpeculativelyHighlighted({ CPUs: null, Humans: null });
      }
    },
    [numCPUs, numHumans]
  );

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

      <CheckboxContainer
        numBoxes={4}
        onCheck={checkNumHumans}
        currentCount={numHumans}
        allowMoreThan2={allowMorePlayers}
        speculativelyHighlighted={speculativelyHighlighted}
        setSpeculativelyHighlighted={setSpeculativelyHighlighted}
        kind="Humans"
      />
      <CheckboxContainer
        numBoxes={4}
        onCheck={checkNumCPUs}
        currentCount={numCPUs}
        allowMoreThan2={true}
        speculativelyHighlighted={speculativelyHighlighted}
        setSpeculativelyHighlighted={setSpeculativelyHighlighted}
        kind="CPUs"
      />
      <AllowMorePlayers
        allowMorePlayers={allowMorePlayers}
        setAllowMorePlayers={setAllowMorePlayers}
        setNumHumans={setNumHumans}
      />
      <ButtonHolder>
        <Button size="small">How&nbsp;&nbsp;To&nbsp;&nbsp;Play</Button>
        <Button
          onClick={(e) => {
            startGame();
          }}
          disabled={status !== WAITING_TO_START_ROUND}
          size="small"
        >
          Start Game
        </Button>
      </ButtonHolder>
    </Wrapper>
  );
}

const ButtonHolder = styled.div`
  display: flex;
  justify-content: space-between;
`;

function CheckboxContainer({
  currentCount,
  kind,
  numBoxes,
  onCheck,
  allowMoreThan2,
  speculativelyHighlighted,
  setSpeculativelyHighlighted,
}) {
  const enabled = React.useCallback(
    (x) => x <= 2 || allowMoreThan2,
    [allowMoreThan2]
  );

  const updateSpeculativelyHighlighted = React.useCallback(
    ({ count, kind }) => {
      setSpeculativelyHighlighted({ count, kind });
    },
    [setSpeculativelyHighlighted]
  );

  const determineBackgroundColor = React.useCallback(
    (count) => {
      // checked is handled in CSS
      const toSpeculativelyHighlight = speculativelyHighlighted[kind];
      const isEnabled = enabled(count);
      if (!isEnabled) {
        return "darkgray";
      }
      if (toSpeculativelyHighlight === null) {
        return count <= currentCount ? "yellow" : "white";
      } else {
        if (count <= toSpeculativelyHighlight) {
          return "yellow";
        } else {
          return isEnabled ? "white" : "darkgray";
        }
      }
    },
    [speculativelyHighlighted, kind, enabled, currentCount]
  );

  return (
    <CheckboxContainerWrapper>
      <CheckboxContainerLabel>{kind}</CheckboxContainerLabel>
      <CheckboxGroupHolder>
        {[...Array(numBoxes)].map((_, i) => (
          <SingleCheckbox
            style={{ "--background-color": determineBackgroundColor(i + 1) }}
            key={i}
            myCheckCount={i + 1}
            checkCount={currentCount}
            onMouseEnter={() =>
              updateSpeculativelyHighlighted({ count: i + 1, kind: kind })
            }
            onMouseLeave={() =>
              updateSpeculativelyHighlighted({ count: 0, kind: null })
            }
            onCheck={onCheck}
            disabled={!enabled(i + 1)}
          />
        ))}
      </CheckboxGroupHolder>
    </CheckboxContainerWrapper>
  );
}

function AllowMorePlayers({
  allowMorePlayers,
  setAllowMorePlayers,
  setNumHumans,
}) {
  const onClick = React.useCallback(() => {
    if (allowMorePlayers) {
      setNumHumans((prev) => Math.min(prev, 2));
    }
    setAllowMorePlayers((prev) => !prev);
  }, [allowMorePlayers, setAllowMorePlayers, setNumHumans]);

  return (
    <CheckboxContainerWrapper>
      <CheckboxContainerLabel>
        Allow &nbsp; &gt;&nbsp;2 &nbsp; humans
      </CheckboxContainerLabel>
      <CheckboxRoot
        checked={allowMorePlayers}
        onCheckedChange={onClick}
        style={{ "--background-color": "white" }}
      ></CheckboxRoot>
    </CheckboxContainerWrapper>
  );
}

const CheckboxContainerWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  pointer-events: auto;
  align-items: center;
  justify-content: space-between;
`;

const CheckboxContainerLabel = styled.span`
  font-size: 1.5rem;
  font-family: "Arcade Classic";
  color: white;
`;

const CheckboxGroupHolder = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
`;

function SingleCheckbox({
  checkCount,
  myCheckCount,
  onCheck,
  onHover,
  ...rest
}) {
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
      {...rest}
    ></CheckboxRoot>
  );
}

const CheckboxRoot = styled(Checkbox.Root)`
  all: unset;
  width: 24px;
  height: 24px;
  background-color: var(--background-color);
  /* background-color: ${(p) => (p.disabled ? "darkgray" : "white")}; */
  pointer-events: auto;

  &:hover {
    /* background-color: ${(p) => (p.disabled ? "darkgray" : "yellow")}; */
    opacity: ${(p) => (p.disabled ? 1 : 0.9)};
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
  display: flex;
  flex-direction: column;
  width: clamp(350px, 50%, 500px);
  left: 50%;
  top: 0%;
  transform: translateX(-50%);
  gap: 2rem;
  z-index: ${zIndex1};
  // blur background
  backdrop-filter: blur(20px);
  padding: 20px;
  border-radius: 20px;
  border: 4px solid white;
`;

const Title = styled.h2`
  grid-area: title;
  font-size: 4rem;
  text-align: center;
  font-family: "Arcade Classic";
`;

const PlayerSelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  opacity: ${(props) => (props.$disabled ? 0 : 1)};
  transition: opacity 0.2s ease-out;
  grid-area: players;
`;

const ButtonWrapper = styled(Button)`
  pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
`;

export default StartScreen;
