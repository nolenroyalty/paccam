import React from "react";
import styled from "styled-components";
import Button from "../Button";
import { zIndex1 } from "../../zindex";
import {
  WAITING_FOR_PLAYER_SELECT,
  WAITING_TO_START_ROUND,
} from "../../STATUS";
import * as Checkbox from "@radix-ui/react-checkbox";

const MAX_PLAYERS = 4;

function StartScreen({ status, startGame, setNumPlayers }) {
  const [numCPUs, setNumCPUs] = React.useState(0);
  const [numHumans, setNumHumans] = React.useState(0);
  const [allowMorePlayers, setAllowMorePlayers] = React.useState(false);
  const [speculativelyHighlighted, _setSpeculativelyHighlighted] =
    React.useState({ CPUs: null, Humans: null });
  const [doThing, setDoThing] = React.useState(false);
  const [hideVideoButton, setHideVideoButton] = React.useState(false);

  const setSpeculativelyHighlighted = React.useCallback(
    ({ count, kind }) => {
      if (kind === "CPUs") {
        const humans = Math.min(MAX_PLAYERS - count, numHumans);
        const cpus = count < numCPUs ? count - 1 : count;
        _setSpeculativelyHighlighted((prev) => ({
          ...prev,
          CPUs: cpus,
          Humans: humans,
        }));
      } else if (kind === "Humans") {
        const cpus = Math.min(MAX_PLAYERS - count, numCPUs);
        const humans = count < numHumans ? count - 1 : count;
        _setSpeculativelyHighlighted((prev) => ({
          ...prev,
          CPUs: cpus,
          Humans: humans,
        }));
      } else {
        _setSpeculativelyHighlighted({
          clickedThisCycle: false,
          CPUs: null,
          Humans: null,
        });
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
      setSpeculativelyHighlighted((prev) => ({
        ...prev,
        clickedThisCycle: true,
      }));
    },
    [numCPUs, setSpeculativelyHighlighted]
  );

  const checkNumCPUs = React.useCallback(
    (numCPUs) => {
      if (numHumans + numCPUs > MAX_PLAYERS) {
        setNumHumans(MAX_PLAYERS - numCPUs);
      }
      setNumCPUs(numCPUs);
      setSpeculativelyHighlighted((prev) => ({
        ...prev,
        clickedThisCycle: true,
      }));
    },
    [numHumans, setSpeculativelyHighlighted]
  );

  if (
    status !== WAITING_FOR_PLAYER_SELECT &&
    status !== WAITING_TO_START_ROUND
  ) {
    return null;
  }

  return (
    <Wrapper>
      <TitleSubheadWrapper>
        <DonoLinkHolder>
          <IconLink href="https://eieio.substack.com" target="_blank">
            <MailIcon />
          </IconLink>
          <IconLink href="https://buymeacoffee.com/eieio" target="_blank">
            <DollarIcon />
          </IconLink>
        </DonoLinkHolder>
        <Title>PacCam</Title>
        <SubHead>
          a game by{" "}
          <a
            href="https://eieio.games"
            target="_blank"
            rel="noreferrer"
            style={{ color: "yellow" }}
          >
            eieio
          </a>
        </SubHead>
      </TitleSubheadWrapper>

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
        {<Button size="small">How&nbsp;&nbsp;To&nbsp;&nbsp;Play</Button>}
        {!doThing && (
          <FadeOutButton
            onClick={(e) => {
              setDoThing(true);
              setHideVideoButton(true);
            }}
            size="small"
            style={{ "--opacity": hideVideoButton ? 0 : 1 }}
          >
            Enable Webcam
          </FadeOutButton>
        )}
        {doThing && (
          <FadeInButton
            onClick={(e) => {
              startGame();
            }}
            disabled={numHumans + numCPUs === 0}
            size="small"
          >
            Start Game
          </FadeInButton>
        )}
      </ButtonHolder>
    </Wrapper>
  );
}

const ButtonHolder = styled.div`
  display: grid;
  /* justify-content: space-between;
  grid-template-columns: 50% 50%;
  gap: 0.5rem;
  padding: 0; */
  grid-template-columns: 100%;
  grid-template-rows: 1fr 1fr;
  justify-items: stretch;
  padding: 0 15%;
  gap: 0.5rem;

  @media (max-width: 650px) {
    grid-template-columns: 100%;
    grid-template-rows: 1fr 1fr;
    justify-items: stretch;
    padding: 0 10%;
  }
`;

const DonoLinkHolder = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: right;
  gap: 0.5rem;
  size: 0.5rem;
  /* margin-bottom: -1rem; */
`;

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1rem"
    height="1rem"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const DollarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1rem"
    height="1rem"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const IconLink = styled.a`
  display: inline-flex;
  vertical-align: middle;
  color: yellow;
  text-decoration: none;
  /* border-radius: 5px; */
  transition: background-color 0.3s ease;

  &:hover {
    color: black;
  }
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
        if (
          count <= toSpeculativelyHighlight &&
          !speculativelyHighlighted.clickedThisCycle
        ) {
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
  pointer-events: auto;

  &:hover {
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
  width: clamp(300px, 70%, 500px);
  left: 50%;
  top: 10%;
  transform: translateX(-50%);
  gap: 2rem;
  z-index: ${zIndex1};
  backdrop-filter: blur(20px) contrast(0.5);
  padding: 20px;
  border-radius: 20px;
  border: 4px solid white;
`;

const Title = styled.h2`
  font-size: 4rem;
  text-align: center;
  line-height: 0.5;
  font-family: "Arcade Classic";
  color: yellow;
`;

const SubHead = styled.h3`
  font-size: 1.5rem;
  text-align: center;
  font-family: "Arcade Classic";
  color: black;
  /* margin-top: -2rem; */

  a {
    color: yellow;
    // dotted underline
    text-decoration-style: dotted;
  }
`;

const TitleSubheadWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FadeOutButton = styled(Button)`
  transition: opacity 0.2s ease;
  opacity: var(--opacity);
`;

const FadeInButton = styled(Button)`
  opacity: 0;
  animation: fadeIn 1s 0.25s forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`;

export default StartScreen;
