import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DanceDebugScene } from "./dance/DanceDebugScene.tsx";
import { danceSceneCall } from "./dance/dance-route.ts";

// The M4 dance debug scene is chosen here rather than inside App, because App calls
// hooks on its first line and an early return there would break the rules of hooks.
// Keeping the branch at the mount point also guarantees the debug scene cannot
// touch the game's state machine.
const danceCall = danceSceneCall(window.location.hash);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {danceCall === null ? <App /> : <DanceDebugScene initialCall={danceCall} />}
  </StrictMode>
);
