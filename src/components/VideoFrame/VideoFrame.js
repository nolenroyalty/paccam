import React from "react";
import styled from "styled-components";
import Button from "../Button";

function VideoFrame({ videoRef, gameRef, setVideoEnabled }) {
  const [buttonDisabled, setButtonDisabled] = React.useState(false);
  const [enabled, setEnabled] = React.useState(false);

  const onClick = React.useCallback(() => {
    // hook video up to webcam
    setButtonDisabled(true);
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        gameRef.current.initVideo(videoRef.current);
        videoRef.current.srcObject = stream;
        setVideoEnabled(true);
        setEnabled(true);
      })
      .catch((err) => {
        console.error("Error accessing the camera.", err);
      });
  }, [gameRef, setVideoEnabled, videoRef]);

  return (
    <Wrapper>
      <EnableVideoButton
        $disabled={buttonDisabled}
        disabled={buttonDisabled}
        onClick={onClick}
        size="large"
      >
        <ButtonText>
          {"Enable  Webcam"}
          <br />
          {"To   Start"}
        </ButtonText>
      </EnableVideoButton>
      <Video
        autoPlay
        muted
        ref={videoRef}
        style={{ "--opacity": enabled ? 0.8 : 0, "--brightness": 0.7 }}
      />
    </Wrapper>
  );
}

const ButtonText = styled.pre`
  white-space: pre-wrap;
  font-family: inherit;
`;

const EnableVideoButton = styled(Button)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  pointer-events: ${(props) => (props.$disabled ? "none" : "auto")};
  opacity: ${(props) => (props.$disabled ? 0 : 1)};
  transition: opacity 1s;
`;

const Wrapper = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
`;

const Video = styled.video`
  object-fit: cover;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1);
  border-radius: 8px;
  opacity: var(--opacity);
  transition: opacity 1s;
  filter: brightness(var(--brightness));
`;

export default VideoFrame;
