import * as THREE from "three";

// Type definitions for RPS GLTF Viewer
export interface AnimationState {
  agvZ?: { start: number; target: number; startTime: number; duration: number };
  agvRotation?: { start: number; target: number; startTime: number; duration: number };
  secondZ?: { start: number; target: number; startTime: number; duration: number };
  liftY?: { start: number; target: number; startTime: number; duration: number };
}

export interface SimulationStep {
  action: "AGV Z" | "AGV Rotation" | "LIFT" | "SECOND";
  value: number;
  duration: number;
}

export interface AGVGroupRefs {
  agvGroup: THREE.Group | null;
  liftGroup: THREE.Group | null;
  secondGroup: THREE.Group | null;
  pivotMarker: THREE.Mesh | null;
}

export interface AGVState {
  zPosition: number;
  rotation: number;
  pivot: { x: number; y: number; z: number };
}

export interface LiftState {
  yPosition: number;
}

export interface SecondState {
  localZ: number;
}

export interface ModelState {
  ready: boolean;
  status: string;
  coverList: string[];
  coverTransparency: Map<string, number>;
  hiddenObjects: Set<string>;
  objectCategories: Map<string, string[]>;
  coverInstances: Map<string, string[]>;
}
