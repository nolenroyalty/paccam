import React from "react";
import styled from "styled-components";
import Button from "../Button";
import { zIndex1 } from "../../zindex";
import { WAITING_FOR_PLAYER_SELECT, WAITING_FOR_VIDEO } from "../../STATUS";
import { COLORS } from "../../COLORS";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Popover from "@radix-ui/react-popover";
import HowToPlay from "../HowToPlay";
import Icons from "../Icons";
import { motion } from "framer-motion";
import TranslucentWindow from "../TranslucentWindow";

const MAX_PLAYERS = 4;

function StartScreen({
  status,
  startGame: _startGame,
  setNumHumans,
  setNumCPUs,
  numHumans,
  numCPUs,
  enableVideo,
  videoEnabled,
  beginTutorial,
  startScreenRef,
}) {
  const [allowMorePlayers, setAllowMorePlayers] = React.useState(
    window.localStorage.getItem("allowMorePlayers") === "true"
  );
  const [speculativelyHighlighted, _setSpeculativelyHighlighted] =
    React.useState({ CPUs: null, Humans: null });
  const [hideVideoButton, setHideVideoButton] = React.useState(false);
  // const [showingHowToPlay, setShowingHowToPlay] = React.useState(false);
  const [hidingHowToPlay, setHidingHowToPlay] = React.useState(false);
  const [aboutToRunTutorial, setAboutToRunTutorial] = React.useState(false);
  const [aboutToStartGame, setAboutToStartGame] = React.useState(false);
  // loaded just prevents the animation from starting before we've loaded
  // everything in
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    window.localStorage.setItem("allowMorePlayers", allowMorePlayers);
  }, [allowMorePlayers]);

  React.useEffect(() => {
    setTimeout(() => {
      setLoaded(true);
    }, 100);
  }, []);

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

  const startGame = React.useCallback(() => {
    setAboutToStartGame(true);
    setTimeout(() => {
      _startGame();
      setAboutToStartGame(false);
    }, 550);
  }, [_startGame]);

  const slideOut = React.useMemo(() => {
    return aboutToStartGame | aboutToRunTutorial;
  }, [aboutToStartGame, aboutToRunTutorial]);

  const startY = slideOut ? "0" : "-100%";
  const endY = slideOut ? "-150%" : "0";
  const startOpacity = slideOut ? 1 : 0;
  const endOpacity = slideOut ? 0 : 1;

  const spring = React.useMemo(() => {
    if (slideOut) {
      return {
        type: "spring",
        stiffness: 90,
        damping: 10,
      };
    } else {
      return {
        type: "spring",
        stiffness: 150, // 225
        damping: 12, // 15
        restDelta: 0.005,
      };
    }
  }, [slideOut]);

  if (status !== WAITING_FOR_PLAYER_SELECT && status !== WAITING_FOR_VIDEO) {
    startScreenRef.current = null;
    return null;
  }

  if (!loaded) {
    return null;
  }

  return (
    <Wrapper
      ref={startScreenRef}
      initial={{ opacity: startOpacity, y: startY, x: "-50%" }}
      animate={{ opacity: endOpacity, y: endY, x: "-50%" }}
      transition={spring}
    >
      <DonoLinkHolder>
        <Icons.Link href="https://eieio.substack.com" target="_blank">
          <Icons.Mail size="16px" />
        </Icons.Link>
        <Icons.Link href="https://buymeacoffee.com/eieio" target="_blank">
          <Icons.Dollar size="16px" />
        </Icons.Link>
        <Icons.Link
          href="https://github.com/nolenroyalty/paccam"
          target="_blank"
        >
          <Icons.Code size="16px" />
        </Icons.Link>
      </DonoLinkHolder>
      <TitleSubheadWrapper>
        <Title>PacCam</Title>
        <SubHead>
          a game by{" "}
          <a
            href="https://eieio.games"
            target="_blank"
            rel="noreferrer"
            style={{ color: COLORS.pacmanYellow }}
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
      <EnableOnlinePlay videoEnabled={videoEnabled} />
      <ButtonHolder>
        {
          <HowToPlay
            // showingHowToPlay={showingHowToPlay}
            // setShowingHowToPlay={setShowingHowToPlay}
            hidingHowToPlay={hidingHowToPlay}
            setHidingHowToPlay={setHidingHowToPlay}
            enableVideo={enableVideo}
            videoEnabled={videoEnabled}
            beginTutorial={beginTutorial}
            setAboutToRunTutorial={setAboutToRunTutorial}
          />
        }
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
    </Wrapper>
  );
}

const Wrapper = styled(TranslucentWindow)`
  position: absolute;
  display: flex;
  flex-direction: column;
  width: clamp(300px, 70%, 500px);
  left: 50%;
  top: 4%;
  gap: 0.75rem;

  // this could be more precise - this really only matters if we're also
  // narrow enough that we're stacking our buttons vertically. but this just
  // makes it more likely that the UI fits on small screens...
  @media (min-height: 730px) {
    top: 10%;
    gap: 1.5rem;
  }

  z-index: ${zIndex1};
  padding: 20px;
  border-radius: 20px;
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
  color: ${COLORS.pacmanYellow};
`;

const SubHead = styled.h3`
  font-size: 1.5rem;
  word-spacing: 0.2rem;
  line-height: 0.85;
  text-align: center;
  font-family: "Arcade Classic";
  color: ${COLORS.white};

  a {
    color: ${COLORS.pacmanYellow};
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
        return COLORS.grey;
      }
      if (toSpeculativelyHighlight === null) {
        return count <= currentCount ? COLORS.pacmanYellow : COLORS.white;
      } else {
        if (
          count <= toSpeculativelyHighlight &&
          !speculativelyHighlighted.clickedThisCycle
        ) {
          return COLORS.pacmanYellow;
        } else {
          return isEnabled ? COLORS.white : COLORS.grey;
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
  word-spacing: 0.2rem;
  color: ${COLORS.white};
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
    background-color: ${COLORS.pacmanYellow};
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
        Allow &gt;2 humans <ExplainMorePlayers />
      </CheckboxContainerLabel>
      <CheckboxRoot
        checked={allowMorePlayers}
        onCheckedChange={onClick}
        style={{
          "--background-color": videoEnabled ? COLORS.white : COLORS.grey,
        }}
        disabled={!videoEnabled}
      ></CheckboxRoot>
    </CheckboxContainerWrapper>
  );
}

function EnableOnlinePlay({ videoEnabled }) {
  return (
    <CheckboxContainerWrapper $videoEnabled={videoEnabled}>
      <CheckboxContainerLabel>
        Play Online <ExplainNoOnlineYet />
      </CheckboxContainerLabel>
      <CheckboxRoot
        checked={false}
        onCheckedChange={() => {}}
        style={{ "--background-color": COLORS.grey }}
        disabled={true}
      ></CheckboxRoot>
    </CheckboxContainerWrapper>
  );
}

function ExplainMorePlayers() {
  return (
    <QuestionmarkPopover>
      Your computer may struggle to track more than 2 faces at a time.
      <br />
      <br />
      Feel free to enable this, but beware that it might not work well :)
    </QuestionmarkPopover>
  );
}

function ExplainNoOnlineYet() {
  return (
    <QuestionmarkPopover>
      I'd like to add online play - but it's a ton of work. So I'd like to know
      people would use the feature before I add it.
      <br />
      <br />
      Want this feature?? Tell me!{" "}
      <a href="https://x.com/itseieio">Tweet at me</a> or{" "}
      <a href="https://mastodon.gamedev.place/home">toot(?)</a> at me or send me{" "}
      <a href="https://buymeacoffee.com/eieio">money</a> or{" "}
      <a href="mailto:eieiogames@gmail.com?subject=I want online play for paccam and i promise i am serious about this request, really really really">
        email me
      </a>{" "}
      or find me on the street and shout me down.
    </QuestionmarkPopover>
  );
}

function QuestionmarkPopover({ children }) {
  // https://github.com/radix-ui/primitives/issues/955
  // Radix folks take a baffling stance on how tooltips are entirely for buttons,
  // which means that they can only respond to hover and not touch. I dunno man.
  // So we use a popover instead, which is slightly worse on desktop imo (these should
  // respond on hover) but all the workarounds are gross. frustrating.
  return (
    <PopoverRoot>
      <PopoverTrigger>
        <Icons.Question size="20px" />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent sideOffset={5} side="top">
          <PopoverArrow width={20} height={10} />
          {children}
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  );
}

const PopoverRoot = styled(Popover.Root)``;
const PopoverTrigger = styled(Popover.Trigger)`
  all: unset;
  color: ${COLORS.white};
  cursor: pointer;

  transition: color 0.2s ease;
  &:hover {
    color: ${COLORS.pacmanYellow};
  }
`;
const PopoverPortal = styled(Popover.Portal)``;
const PopoverContent = styled(Popover.Content)`
  background-color: ${COLORS.black};
  color: ${COLORS.white};
  padding: 1rem;
  max-width: 300px;
  border-radius: 10px;

  &:focus {
    outline: none;
  }

  a {
    color: ${COLORS.pacmanYellow};
    text-decoration-style: dotted;
  }
`;
const PopoverArrow = styled(Popover.Arrow)`
  fill: ${COLORS.black};
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
  justify-content: left;
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
