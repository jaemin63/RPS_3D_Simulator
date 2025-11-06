import { useState, useRef } from "react";
import { wait } from "../utils/animationUtils";
import { generateSimulationSteps } from "../utils/simulationConfig";

interface SimulationCallbacks {
  setAgvZPositionDirect: (value: number) => void;
  setAgvRotationDirect: (degrees: number) => void;
  setLiftYPositionDirect: (value: number) => void;
  setSecondLocalZDirect: (value: number) => void;
}

export function useSimulation(callbacks: SimulationCallbacks) {
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef<{ cancel: boolean }>({ cancel: false });

  const runSimulation = async () => {
    if (isSimulating) return;

    setIsSimulating(true);
    simulationRef.current.cancel = false;

    const steps = generateSimulationSteps();

    try {
      for (let i = 0; i < steps.length; i++) {
        if (simulationRef.current.cancel) break;

        const step = steps[i];
        console.log(`[Simulation] Step ${i + 1}/${steps.length}: ${step.action} = ${step.value}`);

        if (step.action === "AGV Z") {
          callbacks.setAgvZPositionDirect(step.value);
        } else if (step.action === "AGV Rotation") {
          callbacks.setAgvRotationDirect(step.value);
        } else if (step.action === "LIFT") {
          callbacks.setLiftYPositionDirect(step.value);
        } else if (step.action === "SECOND") {
          callbacks.setSecondLocalZDirect(step.value);
        }

        await wait(step.duration);
      }

      console.log("[Simulation] Completed!");
    } catch (error) {
      console.error("[Simulation] Error:", error);
    } finally {
      setIsSimulating(false);
    }
  };

  const stopSimulation = () => {
    simulationRef.current.cancel = true;
    setIsSimulating(false);
  };

  return {
    isSimulating,
    startSimulation: runSimulation,
    stopSimulation,
  };
}
