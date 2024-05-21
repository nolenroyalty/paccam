import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import useFaceLandmarks from "../../hooks/use-face-landmarks";

function App() {
  const videoRef = React.useRef();
  const [videoEnabled, setVideoEnabled] = React.useState(false);
  const [results, setResults] = React.useState([]);

  useFaceLandmarks({ videoRef, videoEnabled, setResults });

  return (
    <GameHolder>
      <Header />
      <One>
        <VideoFrame setVideoEnabled={setVideoEnabled} videoRef={videoRef} />
      </One>
      <Two>
        <Playfield results={results} />
      </Two>
    </GameHolder>
  );
}

const GameHolder = styled.div`
  display: grid;
  grid-template-areas:
    "header"
    "videoframe"
    "playfield";
  grid-template-rows: auto 1fr 1fr;
  width: 100vw;
  height: 100vh;
  gap: 10px;
  align-content: space-between;
  padding-bottom: 10px;

  --max-size: min(calc(50vh - 40px), calc(100vw - 25px));
`;

const Header = styled.div`
  grid-area: header;
  background-color: #d3d3d366;
  opacity: 0;
  height: 50px;
`;

const FittedSquare = styled.div`
  aspect-ratio: 1 / 1;
  max-width: var(--max-size);
  max-height: var(--max-size);
  width: 100%;
  height: 100%;
  justify-self: center;
  border-radius: 8px;
`;

const One = styled(FittedSquare)`
  grid-area: videoframe;
  background-color: lightblue;
`;

const Two = styled(FittedSquare)`
  grid-area: playfield;
  background-color: slategrey;
`;

export default App;
