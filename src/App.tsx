// src/App.tsx
import GLTFViewer from "./components/GLTFViewer";

export default function App() {
  return (
    <GLTFViewer
      src="/models/Multi_RPS.gltf"
      background={0xe8e8e8}  // 연한 회색 배경
    />
  );
}
