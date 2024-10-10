import React from "react";
import styled from "styled-components";
import * as Dialog from "@radix-ui/react-dialog";
import Button from "../Button";

function HowToPlay({
  showingHowToPlay,
  setShowingHowToPlay,
  hidingHowToPlay,
  setHidingHowToPlay,
  enableVideo,
  videoEnabled,
  beginTutorial,
  setRunningTutorial,
}) {
  const showWrapper = React.useCallback(
    (value, runThisToo) => {
      if (value) {
        setShowingHowToPlay(true);
      } else {
        setHidingHowToPlay(true);
        if (runThisToo) {
          setRunningTutorial(true);
        }
        setTimeout(() => {
          setShowingHowToPlay(false);
          setHidingHowToPlay(false);
          if (runThisToo) {
            setRunningTutorial(false);
            runThisToo();
          }
        }, 300);
      }
    },
    [setHidingHowToPlay, setShowingHowToPlay, setRunningTutorial]
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
          <div style={{ display: "flex", justifyContent: "center" }}>
            <VideoDemo
              src="/videos/instructions2.mp4"
              muted
              autoPlay
              loop
            ></VideoDemo>
          </div>
          <ButtonHolder>
            <Button
              onClick={(e) => {
                if (!videoEnabled) {
                  enableVideo();
                }
                showWrapper(false, beginTutorial);
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

const ButtonHolder = styled.div`
  display: grid;
  justify-content: space-between;
  grid-template-columns: minmax(auto, 200px) 1fr minmax(auto, 200px);
  grid-template-areas: "tutorial . close";
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

const VideoDemo = styled.video`
  /* aspect-ratio: 1/1; */
  /* width: clamp(100px, 50%, 150px); */
  width: min(80%, 800px);
  height: auto;
  border-radius: 20px;
  border: 4px solid white;
`;

const DialogContent = styled(Dialog.Content)`
  z-index: 100;
  border-radius: 20px;
  width: clamp(550px, 80%, 800px);
  min-height: min(80%, 800px);
  max-height: 80%;
  padding: 2rem 4rem;
  border: 4px solid white;
  backdrop-filter: blur(20px) contrast(0.8);
  // allow scrolling
  overflow: auto;
  position: fixed;
  top: 5%;
  left: 50%;
  transform: translate(-50%, 0);
  color: white;
  display: grid;
  grid-template-rows: auto 1fr auto;
  transition: opacity 0.25s ease-out;
  opacity: var(--opacity);
  scrollbar-gutter: stable;
  will-change: transform, opacity;
`;

const DialogTitle = styled(Dialog.Title)`
  font-size: 4rem;
  color: yellow;
  font-family: "Arcade Classic";
  word-spacing: 0.5rem;
  line-height: 1;
  padding-bottom: 1rem;
`;

const DialogDescription = styled(Dialog.Description)`
  font-size: 1.5rem;
  color: white;
  font-family: "Arcade Classic";
  word-spacing: 0.25rem;
`;

export default HowToPlay;
