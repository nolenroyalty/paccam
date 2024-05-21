import React from "react";
import styled from "styled-components";

function Playfield({ results }) {
  return (
    <Wrapper>
      <ResultList>
        {results.map((result, index) => (
          <Result key={index}>
            {result.key}: {result.value}
          </Result>
        ))}
      </ResultList>
    </Wrapper>
  );
}

const ResultList = styled.div`
  display: flex;
  flex-direction: column;
`;

const Result = styled.p`
  color: black;
  font-size: 1.5rem;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

export default Playfield;
