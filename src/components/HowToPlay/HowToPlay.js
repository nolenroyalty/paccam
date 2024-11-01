import React from "react";
import styled from "styled-components";
import * as Dialog from "@radix-ui/react-dialog";
import Button from "../Button";
import { COLORS } from "../../COLORS";
import { motion } from "framer-motion";
import TranslucentWindow from "../TranslucentWindow";
import UnstyledButton from "../UnstyledButton";
import { BoxX, X } from "../Icons";

function HowToPlay({
  // showingHowToPlay,
  // setShowingHowToPlay,
  hidingHowToPlay,
  setHidingHowToPlay,
  enableVideo,
  videoEnabled,
  beginTutorial,
  setAboutToRunTutorial,
}) {
  const [showingHowToPlay, setShowingHowToPlay] = React.useState(false);
  const showWrapper = React.useCallback(
    (value, runThisEarly, runThisLate) => {
      if (value) {
        setShowingHowToPlay(true);
      } else {
        setHidingHowToPlay(true);
        if (runThisEarly) {
          runThisEarly();
        }
        setTimeout(() => {
          setShowingHowToPlay(false);
          setHidingHowToPlay(false);
          if (runThisLate) {
            runThisLate();
          }
        }, 350);
      }
    },
    [setShowingHowToPlay, setHidingHowToPlay]
  );

  const springInConfig = {
    type: "spring",
    stiffness: 280,
    damping: 30,
  };

  const springOutConfig = {
    type: "spring",
    stiffness: 90,
    damping: 10,
  };

  const exiting = !showingHowToPlay || hidingHowToPlay;
  const spring = exiting ? springOutConfig : springInConfig;
  const startOpacity = exiting ? 1 : 0.5;
  const endOpacity = exiting ? 0.5 : 1;
  const startY = exiting ? "0%" : "-100%";
  const endY = exiting ? "-150%" : "0%";

  return (
    <Dialog.Root open={showingHowToPlay} onOpenChange={showWrapper}>
      <Dialog.Trigger asChild>
        <Button style={{ width: "100%" }} size="small">
          How to Play
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay />
        <Dialog.Content>
          <DialogContent
            initial={{ opacity: startOpacity, x: "-50%", y: startY }}
            animate={{ opacity: endOpacity, x: "-50%", y: endY }}
            transition={spring}
          >
            <DialogX
              onClick={(e) => {
                showWrapper(false);
              }}
            >
              <X size="32px" />
            </DialogX>
            <DialogTitle>How to Play PacCam</DialogTitle>
            <DialogDescription asChild>
              <div>
                <p>
                  Paccam is multiplayer pacman using your face. Requires a
                  webcam to play.
                </p>
                <VideoDemoWithCanvas />
                <br />
                <ul>
                  <li>Look in the direction you want to move</li>
                  <li>Open and close your mouth to go faster</li>
                  <li>Eat dots to score points</li>
                  <li>Eat big dots to eat other players</li>
                  <li>Try to keep your face in the video frame</li>
                </ul>
                <br />
                <p>
                  Protip: the controls are sensitive - only turn your head a
                  little bit
                </p>
              </div>
            </DialogDescription>

            <ButtonHolder>
              <Button
                onClick={async (e) => {
                  if (!videoEnabled) {
                    await enableVideo();
                  }
                  const runThisEarly = () => {
                    setAboutToRunTutorial(true);
                  };
                  const runThisLate = () => {
                    setAboutToRunTutorial(false);
                    beginTutorial();
                  };
                  showWrapper(false, runThisEarly, runThisLate);
                }}
                size="small"
                style={{ gridArea: "tutorial" }}
              >
                Play Tutorial
              </Button>
              <Dialog.Close asChild style={{ gridArea: "close" }}>
                <Button size="small">Close</Button>
              </Dialog.Close>
            </ButtonHolder>
          </DialogContent>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function VideoDemoWithCanvas() {
  const canvasRef = React.useRef(null);
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    let stopGreenScreen = false;

    const setupGreenscreenOutVideo = () => {
      const draw = () => {
        if (stopGreenScreen) {
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          if (g > 180 && r < 120 && b < 120) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        requestAnimationFrame(draw);
      };
      draw();
    };

    video.addEventListener("play", setupGreenscreenOutVideo);

    return () => {
      video.removeEventListener("play", setupGreenscreenOutVideo);
      stopGreenScreen = true;
    };
  }, []);

  return (
    <VideoDemoWrapper>
      <VideoDemoHiddenVideo
        ref={videoRef}
        src="./videos/instructions-greenscreen.mp4"
        muted
        autoPlay
        playsInline
        loop
      ></VideoDemoHiddenVideo>
      <VideoDemoCanvas
        ref={canvasRef}
        width="1486"
        height="338"
      ></VideoDemoCanvas>
    </VideoDemoWrapper>
  );
}

const VideoDemoWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
`;

const VideoDemoCanvas = styled.canvas`
  width: min(80%, 800px);

  @media (max-width: 600px) {
    width: 100%;
    margin: 1rem 0;
  }

  height: auto;
  margin: 1rem auto;
  border-radius: 20px;
`;

const VideoDemoHiddenVideo = styled.video`
  z-index: -1;
  opacity: 0;
  position: absolute;
  width: 0;
  height: 0;
`;

const ButtonHolder = styled.div`
  display: grid;
  justify-content: space-between;
  grid-template-columns: minmax(auto, 200px) 1fr minmax(auto, 200px);
  grid-template-areas: "tutorial . close";
  gap: 1rem;
  margin-top: 2rem;
`;

const DialogOverlay = styled(Dialog.Overlay)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  color: blue;
`;

const DialogContent = styled(TranslucentWindow)`
  z-index: 100;
  border-radius: 20px;
  width: clamp(300px, 95%, 800px);
  min-height: 50%;
  max-height: 85%;
  padding: 2rem 4rem;
  line-height: 1.2;
  // allow scrolling
  overflow: auto;
  scrollbar-gutter: stable;
  scrollbar-color: lightgrey transparent;
  scrollbar-width: thin;
  position: fixed;
  top: 5%;
  left: 50%;

  @media (max-width: 600px) {
    padding: 1rem 2rem;
    top: 3%;
  }

  @media (max-height: 730px) {
    top: 3%;
  }

  transform: translate(-50%, 0);
  color: ${COLORS.white};
  display: grid;
  grid-template-rows: repeat(3, auto);
  will-change: transform, opacity;
`;

const DialogX = styled(UnstyledButton)`
  position: absolute;
  right: 0.5rem;
  top: 1rem;
  color: ${COLORS.white};
  /* width: 50px; */
  /* height: 50px; */
  /* background-color: green; */
`;

const DialogTitle = styled(Dialog.Title)`
  font-size: clamp(2.5rem, 9.2vw, 4rem);
  color: ${COLORS.pacmanYellow};
  font-family: "Arcade Classic";
  word-spacing: 0.5rem;
  line-height: 1;
  padding-bottom: 1rem;
`;

const DialogDescription = styled(Dialog.Description)`
  font-size: 1.5rem;
  color: ${COLORS.white};
  font-family: "Arcade Classic";
  word-spacing: 0.25rem;
`;

export default HowToPlay;
