import React from "react";
import styled from "styled-components";
import * as Dialog from "@radix-ui/react-dialog";
import Button from "../Button";
import { COLORS } from "../../COLORS";

function HowToPlay({
  showingHowToPlay,
  setShowingHowToPlay,
  hidingHowToPlay,
  setHidingHowToPlay,
  enableVideo,
  videoEnabled,
  beginTutorial,
  setAboutToRunTutorial,
}) {
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
            // setAboutToRunTutorial(false);
            // runThisToo();
          }
        }, 350);
      }
    },
    [setShowingHowToPlay, setHidingHowToPlay]
  );

  return (
    <Dialog.Root open={showingHowToPlay} onOpenChange={showWrapper}>
      <Dialog.Trigger asChild>
        <Button style={{ width: "100%" }} size="small">
          How to Play
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay />
        <DialogContent
          style={{
            "--opacity": hidingHowToPlay ? 0 : 1,
            "--animation":
              hidingHowToPlay || !showingHowToPlay
                ? "HowToDialogExit"
                : "HowToDialogEnter",
          }}
        >
          <DialogTitle>How to Play PacCam</DialogTitle>
          <DialogDescription asChild>
            <div>
              <ul>
                <li>Look in the direction you want to move</li>
                <li>Open and close your mouth to go faster</li>
                <li>Eat dots to score points</li>
                <li>Eat big dots to eat other players</li>
              </ul>
              <br />
              <p>
                Protip: the controls are sensitive - only turn your head a
                little bit
              </p>
            </div>
          </DialogDescription>
          <VideoDemoWithCanvas />
          {/* <div style={{ display: "flex", justifyContent: "center" }}>
            <VideoDemo
              src="/videos/instructions-greenscreen.mp4"
              muted
              autoPlay
              loop
            ></VideoDemo>
          </div> */}
          <ButtonHolder>
            <Button
              onClick={(e) => {
                if (!videoEnabled) {
                  enableVideo();
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
          if (g > 200 && r < 100 && b < 100) {
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
        src="/videos/instructions-greenscreen.mp4"
        muted
        autoPlay
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
  height: auto;
  margin: auto;
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

const DialogContent = styled(Dialog.Content)`
  z-index: 100;
  border-radius: 20px;
  width: min(800px, 95%);
  /* min-height: min(95%, 700px); */
  min-height: 80%;
  max-height: 90%;
  padding: 2rem 4rem;
  border: 2px solid ${COLORS.white};
  backdrop-filter: blur(20px) contrast(0.4);
  box-shadow: 4px 4px 8px 2px rgba(0, 0, 0, 0.3);
  line-height: 1.2;
  // allow scrolling
  overflow: auto;
  scrollbar-gutter: stable;
  scrollbar-color: lightgrey transparent;
  scrollbar-width: thin;
  /* background-clip: padding-box; */
  position: fixed;
  top: 5%;
  left: 50%;
  transform: translate(-50%, 0);
  color: ${COLORS.white};
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  transition: opacity 0.35s ease-out;
  will-change: transform, opacity;

  @keyframes HowToDialogEnter {
    from {
      opacity: 0.5;
      transform: translate(-50%, -100%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  @keyframes HowToDialogExit {
    from {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    to {
      opacity: 0.5;
      transform: translate(-50%, 150%);
    }
  }

  animation: var(--animation) 0.35s ease-out forwards;
  opacity: var(--opacity);
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
