import * as THREE from "three";

interface AGVGroupParams {
  scene: THREE.Scene;
  agvPivot: { x: number; y: number; z: number };
  updatePivotMarkerCallback: (position: { x: number; y: number; z: number }) => void;
}

interface AGVGroupResult {
  agvGroup: THREE.Group;
  liftGroup: THREE.Group | null;
  secondGroup: THREE.Group | null;
}

/**
 * AGV 그룹 생성 (FORK, LIFT, SECOND, AGV_GUIDE 등을 계층적으로 구성)
 */
export function createAGVGroup(params: AGVGroupParams): AGVGroupResult {
  const { scene, agvPivot, updatePivotMarkerCallback } = params;

  const agvPrefixes = ["AGV", "FORK", "LIFT", "PALLET", "ROTATE", "SECOND"];
  const agvMeshes: THREE.Object3D[] = [];
  const liftMeshes: THREE.Object3D[] = [];
  const secondMeshes: THREE.Object3D[] = [];

  scene.traverse((node: any) => {
    if (node.isMesh && node.name) {
      const name = node.name.toUpperCase();
      if (agvPrefixes.some((prefix) => name.startsWith(prefix))) {
        agvMeshes.push(node);

        // LIFT 그룹에 포함될 메시: FORK, SECOND, AGV_GUIDE (윗부분)
        if (name.startsWith("FORK") || name.startsWith("SECOND") || name.startsWith("AGV_GUIDE")) {
          liftMeshes.push(node);
        }

        if (name.startsWith("SECOND")) {
          secondMeshes.push(node);
        }
      }
    }
  });

  if (agvMeshes.length === 0) {
    throw new Error("No AGV meshes found");
  }

  const pivotPoint = new THREE.Vector3(agvPivot.x, agvPivot.y, agvPivot.z);
  const agvGroup = new THREE.Group();
  agvGroup.name = "AGV_Group";
  agvGroup.position.copy(pivotPoint);

  updatePivotMarkerCallback(agvPivot);

  // LIFT 그룹 생성 (FORK, LIFT, SECOND를 포함)
  let liftGroup: THREE.Group | null = null;
  if (liftMeshes.length > 0) {
    liftGroup = new THREE.Group();
    liftGroup.name = "LIFT_Group";

    const firstLift = liftMeshes[0];
    const liftGroupPos = new THREE.Vector3();
    firstLift.getWorldPosition(liftGroupPos);
    liftGroup.position.copy(liftGroupPos);

    liftMeshes.forEach((mesh) => {
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      mesh.getWorldQuaternion(worldQuat);
      mesh.getWorldScale(worldScale);

      mesh.removeFromParent();

      mesh.position.copy(worldPos.sub(liftGroupPos));
      mesh.quaternion.copy(worldQuat);
      mesh.scale.copy(worldScale);
      liftGroup.add(mesh);
    });
  }

  // AGV 그룹에 메시 추가 (LIFT 그룹에 포함되지 않은 메시만)
  agvMeshes.forEach((mesh) => {
    if (liftMeshes.includes(mesh)) return;

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    mesh.getWorldQuaternion(worldQuat);
    mesh.getWorldScale(worldScale);

    mesh.removeFromParent();

    mesh.position.copy(worldPos.sub(pivotPoint));
    mesh.quaternion.copy(worldQuat);
    mesh.scale.copy(worldScale);
    agvGroup.add(mesh);
  });

  // LIFT 그룹을 AGV 그룹에 추가
  if (liftGroup) {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    liftGroup.getWorldPosition(worldPos);
    liftGroup.getWorldQuaternion(worldQuat);
    liftGroup.getWorldScale(worldScale);

    liftGroup.position.copy(worldPos.sub(pivotPoint));
    liftGroup.quaternion.copy(worldQuat);
    liftGroup.scale.copy(worldScale);
    agvGroup.add(liftGroup);
  }

  scene.add(agvGroup);
  agvGroup.updateMatrixWorld(true);

  // SECOND 그룹 생성 (LIFT 그룹 내에서)
  let secondGroup: THREE.Group | null = null;
  if (secondMeshes.length > 0 && liftGroup) {
    secondGroup = new THREE.Group();
    secondGroup.name = "SECOND_Group";

    const firstSecond = secondMeshes[0];
    const groupPos = new THREE.Vector3();
    firstSecond.getWorldPosition(groupPos);
    secondGroup.position.copy(groupPos);

    secondMeshes.forEach((mesh) => {
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      mesh.getWorldQuaternion(worldQuat);
      mesh.getWorldScale(worldScale);

      const parent = mesh.parent;
      if (parent) {
        const indexInParent = parent.children.indexOf(mesh);
        parent.children.splice(indexInParent, 1);
      }

      mesh.position.copy(worldPos.sub(groupPos));
      mesh.quaternion.copy(worldQuat);
      mesh.scale.copy(worldScale);
      secondGroup.add(mesh);
    });

    // LIFT 그룹 기준으로 위치 조정
    const liftGroupPos = new THREE.Vector3();
    liftGroup.getWorldPosition(liftGroupPos);

    const groupWorldPos = new THREE.Vector3();
    const groupWorldQuat = new THREE.Quaternion();
    const groupWorldScale = new THREE.Vector3();
    secondGroup.getWorldPosition(groupWorldPos);
    secondGroup.getWorldQuaternion(groupWorldQuat);
    secondGroup.getWorldScale(groupWorldScale);

    secondGroup.position.copy(groupWorldPos.sub(liftGroupPos));
    secondGroup.quaternion.copy(groupWorldQuat);
    secondGroup.scale.copy(groupWorldScale);
    liftGroup.add(secondGroup);
    secondGroup.updateMatrixWorld(true);
  }

  agvGroup.updateMatrixWorld(true);
  return { agvGroup, liftGroup, secondGroup };
}
