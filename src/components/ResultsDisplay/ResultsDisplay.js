import React from "react";
import styled from "styled-components";

function ResultsDisplay({ results }) {
  return (
    <ResultList>
      {results.map((result, index) => (
        <Result key={index}>
          {result.key}: {result.value}
        </Result>
      ))}
    </ResultList>
  );
}

const ResultList = styled.div`
  position: absolute;
  left: 10%;
  top: 30%;
  display: flex;
  flex-direction: column;
`;

const Result = styled.p`
  color: white;
  font-size: 1.5rem;
`;

export default ResultsDisplay;
