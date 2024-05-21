import React from "react";
import styled from "styled-components";
import Playfield from "../Playfield";
import VideoFrame from "../VideoFrame";
import StatusBar from "../StatusBar";

function App() {
  return (
    <GameHolder>
      <Header />
      <One>
        <VideoFrame />
      </One>
      <Two />
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

// const MaxWidthWrapper = styled.div`
//   max-width: 800px;
//   padding: 0 32px;
//   margin: 0 auto;
//   background-color: slategrey;
// `;

// const Wrapper = styled.div`
//   display: flex;
//   height: 100%;
//   flex-direction: column;
// `;

// const InnerWrapper = styled.div`
//   flex-grow: 1;
//   display: grid;
//   flex-direction: column;
//   align-items: center;
//   background-color: green;
//   grid-template-columns: 1fr;
// `;

export default App;
