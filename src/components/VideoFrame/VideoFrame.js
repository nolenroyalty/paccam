import React from "react";
import styled from "styled-components";

function VideoFrame({ videoRef, videoActuallyStartedState }) {
  return (
    <Wrapper>
      <Video
        autoPlay
        muted
        ref={videoRef}
        playsInline
        style={{
          "--opacity": videoActuallyStartedState ? 1 : 0,
          "--brightness": 0.8,
        }}
      />
    </Wrapper>
  );
}

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
