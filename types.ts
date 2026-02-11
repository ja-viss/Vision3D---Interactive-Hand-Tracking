
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CubeState {
  id: number;
  position: Point3D;
  active: boolean;
  color: number;
}

export interface GestureState {
  fingerCount: number;
  handPos: Point3D;
  cubes: CubeState[];
}

export interface SceneProps {
  gesture: GestureState;
  hasHands: boolean;
}
