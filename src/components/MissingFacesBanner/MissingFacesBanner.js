import React from "react";
import styled from "styled-components";
import { COLORS } from "../../COLORS";

/* could do something here where we save off our last-shown text to make it fade out nicer
 but it's probably not necessary? */

function MissingFacesBanner({ gameRef }) {
  const [missingFacesStatus, setMissingFacesStatus] = React.useState(null);
  const id = React.useId();
  React.useEffect(() => {
    let game = gameRef.current;
    game.subscribeToMissingFaces({
      callback: setMissingFacesStatus,
      id: id,
    });
    return () => {
      game.unsubscribeFromMissingFaces({ id });
    };
  }, [gameRef, id]);

  if (missingFacesStatus === null) {
    return null;
  }
  const status = missingFacesStatus.status;
  const shouldShow = status === "missing-over-threshold";
  let showText = null;
  if (shouldShow) {
    if (missingFacesStatus.actualFaces === 0) {
      showText = "No faces detected";
    } else {
      const noun = missingFacesStatus.actualFaces === 1 ? "face" : "faces";
      showText = `Only ${missingFacesStatus.actualFaces} ${noun} detected (expected ${missingFacesStatus.expectedFaces})`;
    }
  }

  return (
    <Wrapper
      style={{
        "--animation": shouldShow
          ? "missingFacesFadeIn 0.4s both"
          : "missingFacesFadeOut 0.1s both",
      }}
    >
      {shouldShow ? <p>{showText}</p> : null}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  @keyframes missingFacesFadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes missingFacesFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  animation: var(--animation);
  position: fixed;
  display: flex;
  top: 0;
  left: 0;
  right: 0;
  height: 2rem;
  font-size: 1rem;
  justify-content: center;
  align-items: center;
  font-family: "Arcade Classic";
  // tweak space between words
  word-spacing: 0.2rem;
  background-color: ${COLORS.transparentBannerRed};
  color: ${COLORS.white};
`;

export default React.memo(MissingFacesBanner);
