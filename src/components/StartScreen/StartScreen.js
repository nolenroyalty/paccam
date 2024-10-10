import React from "react";
import styled from "styled-components";
import Button from "../Button";
import { zIndex1 } from "../../zindex";
import { WAITING_FOR_PLAYER_SELECT, WAITING_FOR_VIDEO } from "../../STATUS";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Tooltip from "@radix-ui/react-tooltip";
import Icons from "../Icons";

const MAX_PLAYERS = 4;

function StartScreen({
  status,
  startGame,
  setNumHumans,
  setNumCPUs,
  numHumans,
  numCPUs,
  enableVideo,
  videoEnabled,
}) {
  const [allowMorePlayers, setAllowMorePlayers] = React.useState(false);
  const [speculativelyHighlighted, _setSpeculativelyHighlighted] =
    React.useState({ CPUs: null, Humans: null });
  const [hideVideoButton, setHideVideoButton] = React.useState(false);

  const setSpeculativelyHighlighted = React.useCallback(
    ({ count, kind }) => {
      if (kind === "CPUs") {
        const humans = Math.min(MAX_PLAYERS - count, numHumans);
        const cpus = count === numCPUs ? count - 1 : count;
        _setSpeculativelyHighlighted((prev) => ({
          ...prev,
          CPUs: cpus,
          Humans: humans,
        }));
      } else if (kind === "Humans") {
        const cpus = Math.min(MAX_PLAYERS - count, numCPUs);
        const humans = count === numHumans ? count - 1 : count;
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
    (count) => {
      if (count + numCPUs > MAX_PLAYERS) {
        setNumCPUs(MAX_PLAYERS - count);
      }
      setNumHumans(count);
      setSpeculativelyHighlighted((prev) => ({
        ...prev,
        clickedThisCycle: true,
      }));
    },
    [numCPUs, setNumHumans, setSpeculativelyHighlighted, setNumCPUs]
  );

  const checkNumCPUs = React.useCallback(
    (count) => {
      if (numHumans + count > MAX_PLAYERS) {
        setNumHumans(MAX_PLAYERS - count);
      }
      setNumCPUs(count);
      setSpeculativelyHighlighted((prev) => ({
        ...prev,
        clickedThisCycle: true,
      }));
    },
    [numHumans, setNumCPUs, setNumHumans, setSpeculativelyHighlighted]
  );

  if (status !== WAITING_FOR_PLAYER_SELECT && status !== WAITING_FOR_VIDEO) {
    return null;
  }

  return (
    <Wrapper>
      <TitleSubheadWrapper>
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
        videoEnabled={videoEnabled}
      />
      <CheckboxContainer
        numBoxes={4}
        onCheck={checkNumCPUs}
        currentCount={numCPUs}
        allowMoreThan2={true}
        speculativelyHighlighted={speculativelyHighlighted}
        setSpeculativelyHighlighted={setSpeculativelyHighlighted}
        kind="CPUs"
        videoEnabled={videoEnabled}
      />
      <AllowMorePlayers
        allowMorePlayers={allowMorePlayers}
        setAllowMorePlayers={setAllowMorePlayers}
        numHumans={numHumans}
        setNumHumans={setNumHumans}
        videoEnabled={videoEnabled}
      />
      <ButtonHolder>
        {<Button size="small">How&nbsp;&nbsp;To&nbsp;&nbsp;Play</Button>}
        {!videoEnabled && (
          <FadeOutButton
            onClick={(e) => {
              enableVideo(true);
              setHideVideoButton(true);
            }}
            size="small"
            style={{ "--opacity": hideVideoButton ? 0 : 1 }}
          >
            Enable Webcam
          </FadeOutButton>
        )}
        {videoEnabled && (
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
      <DonoLinkHolder>
        <Icons.Link href="https://eieio.substack.com" target="_blank">
          <Icons.Mail size="1rem" />
        </Icons.Link>
        <Icons.Link href="https://buymeacoffee.com/eieio" target="_blank">
          <Icons.Dollar size="1rem" />
        </Icons.Link>
        <Icons.Link
          href="https://github.com/nolenroyalty/paccam"
          target="_blank"
        >
          <Icons.Code size="1rem" />
        </Icons.Link>
      </DonoLinkHolder>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  width: clamp(300px, 70%, 500px);
  left: 50%;
  top: 10%;
  transform: translateX(-50%);
  gap: 1.5rem;
  z-index: ${zIndex1};
  backdrop-filter: blur(20px) contrast(0.5);
  padding: 20px;
  border-radius: 20px;
  border: 4px solid white;
`;

const TitleSubheadWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

  a {
    color: yellow;
    text-decoration-style: dotted;
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
  videoEnabled,
}) {
  const enabled = React.useCallback(
    (x) => (x <= 2 || allowMoreThan2) && videoEnabled,
    [allowMoreThan2, videoEnabled]
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
    <CheckboxContainerWrapper $videoEnabled={videoEnabled}>
      <CheckboxContainerLabel>
        {kind === "CPUs" ? "Bots" : "Humans"}
      </CheckboxContainerLabel>
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

const CheckboxContainerWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  pointer-events: auto;
  align-items: center;
  justify-content: space-between;
  opacity: ${(p) => (p.$videoEnabled ? 1 : 0.3)};
  transition: opacity 0.5s ease;
`;

const CheckboxContainerLabel = styled.span`
  font-size: 1.5rem;
  font-family: "Arcade Classic";
  color: white;
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 0.5rem;
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
      if (checkCount === myCheckCount) {
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

function AllowMorePlayers({
  allowMorePlayers,
  setAllowMorePlayers,
  numHumans,
  setNumHumans,
  videoEnabled,
}) {
  const onClick = React.useCallback(() => {
    if (allowMorePlayers) {
      setNumHumans(Math.min(numHumans, 2));
    }
    setAllowMorePlayers((prev) => !prev);
  }, [allowMorePlayers, setAllowMorePlayers, numHumans, setNumHumans]);

  return (
    <CheckboxContainerWrapper $videoEnabled={videoEnabled}>
      <CheckboxContainerLabel>
        Allow &nbsp; &gt;&nbsp;2 &nbsp; humans <ExplainMorePlayers />
      </CheckboxContainerLabel>
      <CheckboxRoot
        checked={allowMorePlayers}
        onCheckedChange={onClick}
        style={{ "--background-color": "white" }}
        disabled={!videoEnabled}
      ></CheckboxRoot>
    </CheckboxContainerWrapper>
  );
}

function ExplainMorePlayers() {
  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger>
          <Icons.Question size="1.25rem" />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent sideOffset={5}>
            <TooltipArrow width={20} height={10} />
            Many computers struggle to track more than 2 faces at a time. And
            frankly it's hard to fit 4 faces on the screen at once!
            <br />
            <br />
            Feel free to enable this, but beware that it might not work well :)
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </TooltipProvider>
  );
}

const TooltipProvider = styled(Tooltip.Provider)``;
const TooltipRoot = styled(Tooltip.Root)``;
const TooltipTrigger = styled(Tooltip.Trigger)`
  all: unset;
  color: white;
  cursor: pointer;
`;
const TooltipPortal = styled(Tooltip.Portal)``;
const TooltipContent = styled(Tooltip.Content)`
  background-color: black;
  color: white;
  padding: 1rem;
  max-width: 300px;
  border-radius: 10px;
`;
const TooltipArrow = styled(Tooltip.Arrow)`
  fill: black;
`;

const ButtonHolder = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 100%;
  justify-content: center;
  padding: 1rem 0 0;
  gap: 2rem;

  @media (max-width: 650px) {
    grid-template-columns: 100%;
    grid-template-rows: 1fr 1fr;
    justify-items: stretch;
    padding: 1rem 10% 0;
    gap: 1rem;
  }
`;

const DonoLinkHolder = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: right;
  align-items: center;
  gap: 0.5rem;
  size: 0.5rem;
`;

const FadeOutButton = styled(Button)`
  transition: opacity 0.2s ease;
  opacity: var(--opacity);
`;

const FadeInButton = styled(Button)`
  opacity: 0;
  animation: fadeIn 0.5s 0.2s forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`;

export default StartScreen;
