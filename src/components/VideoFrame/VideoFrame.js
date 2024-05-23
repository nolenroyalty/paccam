import React from "react";
import styled from "styled-components";
import UnstyledButton from "../UnstyledButton";
import GameEngine from "../../CoreGame";

function VideoFrame({ videoRef, gameRef, setVideoEnabled }) {
  const [buttonDisabled, setButtonDisabled] = React.useState(false);

  const onClick = React.useCallback(() => {
    // hook video up to webcam
    setButtonDisabled(true);
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        gameRef.current.initVideo(videoRef.current);
        videoRef.current.srcObject = stream;
        gameRef.current.start();
        setVideoEnabled(true);
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
      >
        <ButtonText>Enable Video</ButtonText>
      </EnableVideoButton>
      <Video autoPlay muted ref={videoRef} />
    </Wrapper>
  );
}

const ButtonText = styled.p`
  font-size: 1.5rem;
  color: white;
`;

const EnableVideoButton = styled(UnstyledButton)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
  height: 25%;
  border-radius: 8px;
  border: 2px solid slategrey;
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
  opacity: 0.8;
`;

export default VideoFrame;
