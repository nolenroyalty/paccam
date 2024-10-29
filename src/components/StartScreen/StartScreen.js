import React from "react";
import styled from "styled-components";
import Button from "../Button";
import UnstyledButton from "../UnstyledButton";
import { zIndex1 } from "../../zindex";
import { WAITING_FOR_PLAYER_SELECT, WAITING_FOR_VIDEO } from "../../STATUS";
import { COLORS } from "../../COLORS";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Popover from "@radix-ui/react-popover";
import HowToPlay from "../HowToPlay";
import Icons from "../Icons";
import TranslucentWindow from "../TranslucentWindow";

const MAX_PLAYERS = 4;

const useStartingAnimationComplete = ({
  startingAnimationCompletePromiseRef,
  status,
}) => {
  const resolveRef = React.useRef();
  const [isInitial, setIsInitial] = React.useState(true);
  const [hasFinished, setHasFinished] = React.useState(false);

  React.useEffect(() => {
    if (status !== WAITING_FOR_PLAYER_SELECT) {
      setIsInitial(true);
      setHasFinished(false);
      return;
    }
  }, [status]);

  React.useEffect(() => {
    if (isInitial) {
      setIsInitial(false);
      startingAnimationCompletePromiseRef.current = new Promise((resolve) => {
        resolveRef.current = resolve;
        setHasFinished(true);
      });
    }
  }, [isInitial, startingAnimationCompletePromiseRef]);

  const handleAnimationComplete = React.useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current();
    }
  }, []);

  return { handleAnimationComplete, animationHasFinished: hasFinished };
};

function StartScreen({
  status,
  startGame: _startGame,
  setNumPlayers,
  numHumans,
  numBots,
  enableVideo,
  videoEnabled,
  beginTutorial,
  startScreenRef,
  landmarkerLoading,
  startingAnimationCompletePromiseRef,
}) {
  const [allowMorePlayers, setAllowMorePlayers] = React.useState(
    window.localStorage.getItem("allowMorePlayers") === "true"
  );
  const [hideVideoButton, setHideVideoButton] = React.useState(false);
  const [hidingHowToPlay, setHidingHowToPlay] = React.useState(false);
  const [aboutToRunTutorial, setAboutToRunTutorial] = React.useState(false);
  const [aboutToStartGame, setAboutToStartGame] = React.useState(false);
  // loaded just prevents the animation from starting before we've loaded
  // everything in
  const [loaded, setLoaded] = React.useState(false);
  const { handleAnimationComplete, animationHasFinished } =
    useStartingAnimationComplete({
      startingAnimationCompletePromiseRef,
      status,
    });

  React.useEffect(() => {
    window.localStorage.setItem("allowMorePlayers", allowMorePlayers);
  }, [allowMorePlayers]);

  React.useEffect(() => {
    setTimeout(() => {
      setLoaded(true);
    }, 100);
  }, []);

  const updateNumHumans = React.useCallback(
    (delta) => {
      let _numBots = null;
      let count = numHumans + delta;
      count = Math.min(MAX_PLAYERS, Math.max(0, count));
      if (count + numBots > MAX_PLAYERS) {
        _numBots = MAX_PLAYERS - count;
      }
      setNumPlayers({ numHumans: count, numBots: _numBots });
    },
    [numBots, numHumans, setNumPlayers]
  );

  const updateNumBots = React.useCallback(
    (delta) => {
      let _numHumans = null;
      let count = numBots + delta;
      count = Math.min(MAX_PLAYERS, Math.max(0, count));
      if (count + numHumans > MAX_PLAYERS) {
        _numHumans = MAX_PLAYERS - count;
      }
      setNumPlayers({ numHumans: _numHumans, numBots: count });
    },
    [numBots, numHumans, setNumPlayers]
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
        stiffness: 100, // 225
        damping: 12, // 15
        restDelta: 0.5,
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
      onAnimationComplete={handleAnimationComplete}
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
      <PlusMinusNumber
        label={"Humans"}
        number={numHumans}
        maxCount={allowMorePlayers ? MAX_PLAYERS : 2}
        updateNumber={updateNumHumans}
        videoEnabled={videoEnabled}
      />
      <PlusMinusNumber
        label={"Bots"}
        number={numBots}
        maxCount={MAX_PLAYERS}
        updateNumber={updateNumBots}
        videoEnabled={videoEnabled}
      />
      <AllowMorePlayers
        allowMorePlayers={allowMorePlayers}
        setAllowMorePlayers={setAllowMorePlayers}
        numHumans={numHumans}
        setNumPlayers={setNumPlayers}
        videoEnabled={videoEnabled}
      />

      <EnableOnlinePlay videoEnabled={videoEnabled} />
      <ButtonHolder>
        {
          <HowToPlay
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
            onClick={async (e) => {
              await enableVideo(true);
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
            disabled={
              numHumans + numBots === 0 ||
              landmarkerLoading ||
              !animationHasFinished
            }
            // Landmarker loading is blocking. We can try to delay our transition speed,
            // but this doesn't work super well because the landmarker loading blocks
            // the css transition. Instead we try making the speed super snappy, so that
            // the button transitions during the loading.
            // transitionDelay={landmarkerLoading ? "0s" : "0s"}
            overrideTransitionSpeed={landmarkerLoading ? "0.05s" : null}
            size="small"
          >
            {numHumans + numBots === 0
              ? "Select Players"
              : landmarkerLoading
                ? "Loading..."
                : "Start Game"}
            {/* "Start Game"} */}
          </FadeInButton>
        )}
      </ButtonHolder>
      <NoVideoLeaves>(video stays on your device)</NoVideoLeaves>
    </Wrapper>
  );
}

const PlusMinusOuterWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  opacity: var(--opacity);
  transition: opacity 0.5s ease;
`;

const PlusMinusWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${COLORS.pacmanYellow};
  border-radius: 8px;
  flex: 1;
  max-width: min(180px, 50%);
`;

const PlusMinusButton = styled(UnstyledButton)`
  padding: 0.25rem 0.5rem;
  color: ${(p) => (p.disabled ? COLORS.black : COLORS.black)};
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: ${(p) => (p.$left ? "flex-start" : "flex-end")};
  opacity: ${(p) => (p.disabled ? 0.3 : 1)};
  transition: opacity 0.5s ease;
`;

const PlusMinusText = styled.span`
  font-size: 1.5rem;
  color: var(--color);
  font-family: "Arcade Classic";
  transition: opacity 0.5s ease;
`;

function PlusMinusNumber({
  label,
  number,
  maxCount,
  updateNumber,
  videoEnabled,
}) {
  return (
    <PlusMinusOuterWrapper style={{ "--opacity": videoEnabled ? 1 : 0.3 }}>
      <PlusMinusText style={{ "--color": COLORS.white }}>{label}</PlusMinusText>
      <PlusMinusWrapper>
        <PlusMinusButton
          $left={true}
          onClick={() => updateNumber(-1)}
          disabled={!videoEnabled || number === 0}
        >
          <Icons.Minus size="24px" />
        </PlusMinusButton>
        <PlusMinusText style={{ "--color": COLORS.black }}>
          {number}
        </PlusMinusText>
        <PlusMinusButton
          $left={false}
          onClick={() => updateNumber(1)}
          disabled={!videoEnabled || number === maxCount}
        >
          <Icons.Plus size="24px" />
        </PlusMinusButton>
      </PlusMinusWrapper>
    </PlusMinusOuterWrapper>
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

const NoVideoLeaves = styled.p`
  font-size: 1rem;
  font-family: "Arcade Classic";
  word-spacing: 0.2rem;
  color: ${COLORS.white};
  text-align: center;
  line-height: 1;
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

// checkbox code is a little weird because player select used to rely
// on checkboxes as well. haven't bothered to disentagle it.
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
  setNumPlayers,
  videoEnabled,
}) {
  const onClick = React.useCallback(() => {
    if (allowMorePlayers) {
      setNumPlayers({ numHumans: Math.min(numHumans, 2), numBots: null });
    }
    setAllowMorePlayers((prev) => !prev);
  }, [allowMorePlayers, setAllowMorePlayers, setNumPlayers, numHumans]);

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

export default React.memo(StartScreen);
