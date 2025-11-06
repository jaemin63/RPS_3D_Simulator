// src/App.tsx
import GLTFViewer from "./components/GLTFViewer";

export default function App() {
  return (
    <GLTFViewer
      src="/models/Multi_RPS.gltf"
      background={0x111214}  // 어두운 배경 (모델 가시성 테스트)
    />
  );
}
