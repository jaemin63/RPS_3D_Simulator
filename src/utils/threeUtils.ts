import * as THREE from "three";

/**
 * Three.js 객체를 재귀적으로 dispose하여 메모리 누수 방지
 */
export function disposeObject(obj: THREE.Object3D | null) {
  if (!obj) return;
  obj.traverse((node: any) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => mat.dispose());
    }
  });
}

/**
 * 카메라를 바운딩 박스에 맞게 자동 조정
 */
export function fitCameraToBox(camera: THREE.PerspectiveCamera, box: THREE.Box3, padding = 1.2) {
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= padding;

  const direction = camera.position.clone().sub(center).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(cameraZ));

  camera.near = cameraZ / 100;
  camera.far = cameraZ * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(center);
}

/**
 * Pivot 마커 생성
 */
export function createPivotMarker(position: { x: number; y: number; z: number }): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.05, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false });
  const marker = new THREE.Mesh(geometry, material);
  marker.position.set(position.x, position.y, position.z);
  marker.renderOrder = 9999;
  return marker;
}
