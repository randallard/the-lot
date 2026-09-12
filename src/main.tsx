import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DanceDebugScene } from "./dance/DanceDebugScene.tsx";
import { danceSceneFigure } from "./dance/dance-route.ts";
import { DanceReviewScene } from "./dance/DanceReviewScene.tsx";
import { reviewSceneCell } from "./dance/review-route.ts";

// The M4 dance debug scene and the pose review are chosen here rather than inside App,
// because App calls hooks on its first line and an early return there would break the
// rules of hooks. Keeping the branch at the mount point also guarantees neither debug
// scene can touch the game's state machine.
//
// `#review` is checked first only because the two patterns are disjoint and something has
// to go first; neither hash can match the other's parser.
const reviewCell = reviewSceneCell(window.location.hash);
const danceFigure = reviewCell === null ? danceSceneFigure(window.location.hash) : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {reviewCell !== null ? (
      <DanceReviewScene initialCell={reviewCell} />
    ) : danceFigure === null ? (
      <App />
    ) : (
      <DanceDebugScene initialFigure={danceFigure} />
    )}
  </StrictMode>
);
