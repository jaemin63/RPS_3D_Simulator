import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

type Props = { src: string; background?: number; helpers?: boolean };

const GLTFViewer: React.FC<Props> = ({ src, background = 0x111214, helpers = true }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const bboxHelperRef = useRef<THREE.Box3Helper | null>(null);
  const statsRef = useRef<any>(null);

  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);
  const [coverList, setCoverList] = useState<string[]>([]);
  // COVER 이름 -> 투명도 레벨 (0: 불투명, 1: 약한 반투명, 2: 강한 반투명)
  const [coverTransparency, setCoverTransparency] = useState<Map<string, number>>(new Map());
  const [showPanel, setShowPanel] = useState(true);
  const [hiddenObjects, setHiddenObjects] = useState<Set<string>>(new Set());
  const [objectCategories, setObjectCategories] = useState<Map<string, string[]>>(new Map());
  const [coverInstances, setCoverInstances] = useState<Map<string, string[]>>(new Map()); // COVER -> 개별 인스턴스 목록
  const [expandedCovers, setExpandedCovers] = useState<Set<string>>(new Set()); // 확장된 COVER 목록

  // PALLET 테스트 관련 상태
  const palletGroupRef = useRef<THREE.Group | null>(null);
  const [palletPosition, setPalletPosition] = useState({ x: 0, y: 0, z: 0 }); // 단위: m (미터)

  // AGV 그룹 관련 상태 (AGV, FORK, LIFT, PALLET, ROTATE, SECOND)
  const agvGroupRef = useRef<THREE.Group | null>(null);
  const [isAgvGrouped, setIsAgvGrouped] = useState(false);
  const [agvZPosition, setAgvZPosition] = useState(0); // Z축 위치 (단위: m)

  // ========== 1) Three.js 초기화 (한 번만) ==========
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance", // GPU 성능 우선
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // NoToneMapping: 원본 색상 그대로 표시 (Windows 3D Viewer와 유사)
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;

    // 투명 렌더링 최적화
    renderer.sortObjects = true; // 투명 객체 정렬 활성화

    const updateSize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      if (cameraRef.current) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    updateSize();

    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.pointerEvents = "auto";
    canvas.style.touchAction = "none";
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    camera.position.set(5, 5, 5);

    // 조명 - 매우 밝게 (쨍한 느낌)
    scene.add(new THREE.AmbientLight(0xffffff, 2.0)); // Ambient 더 밝게
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 10, 5);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-5, 5, -5); // 반대편에서도 조명
    scene.add(dirLight2);
    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight3.position.set(0, -5, 0); // 아래에서도 조명
    scene.add(dirLight3);

    // 헬퍼 (그리드, 축)
    if (helpers) {
      scene.add(new THREE.GridHelper(20, 20, 0x888888, 0x444444));
      scene.add(new THREE.AxesHelper(2));
    }

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    // Stats 성능 모니터 추가
    const stats = new Stats();
    stats.dom.style.position = "absolute";
    stats.dom.style.left = "12px";
    stats.dom.style.top = "12px";
    stats.dom.style.zIndex = "1000";
    mount.appendChild(stats.dom);
    statsRef.current = stats;

    // ResizeObserver
    const ro = new ResizeObserver(updateSize);
    ro.observe(mount);

    // 애니메이션 루프
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      stats.begin(); // 성능 측정 시작
      controls.update();
      renderer.render(scene, camera);
      stats.end(); // 성능 측정 종료
    };
    loop();

    console.log("[GLTFViewer] Three.js initialized");
    setReady(true);

    return () => {
      console.log("[GLTFViewer] Cleanup");
      setReady(false);
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      if (bboxHelperRef.current) scene.remove(bboxHelperRef.current);
      disposeObject(modelRef.current);
      renderer.dispose();
      if (statsRef.current) mount.removeChild(stats.dom);
      mount.removeChild(canvas);
    };
  }, [background, helpers]);

  // ========== 2) GLTF 모델 로드 (ready 후) ==========
  useEffect(() => {
    if (!ready || !src || !sceneRef.current || !cameraRef.current) return;

    let aborted = false;

    (async () => {
      try {
        console.log("[GLTFViewer] Loading model:", src);
        setStatus("Loading…");

        const scene = sceneRef.current!;
        const camera = cameraRef.current!;
        const controls = controlsRef.current!;

        // 기존 모델 제거
        if (bboxHelperRef.current) {
          scene.remove(bboxHelperRef.current);
          bboxHelperRef.current = null;
        }
        if (modelRef.current) {
          scene.remove(modelRef.current);
          disposeObject(modelRef.current);
          modelRef.current = null;
        }

        // GLTF 로더 설정
        const loader = new GLTFLoader();
        const draco = new DRACOLoader();
        draco.setDecoderPath("/draco/");
        loader.setDRACOLoader(draco);

        // Meshopt (선택적)
        try {
          const mod: any = await import("three/examples/jsm/libs/meshopt_decoder.module.js");
          loader.setMeshoptDecoder(mod.default ?? mod);
        } catch {}

        // GLTF 파일 로드
        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} on ${src}`);
        const buf = await res.arrayBuffer();
        const base = src.substring(0, src.lastIndexOf("/") + 1);

        const gltf = await new Promise<any>((ok, err) => loader.parse(buf, base, (g) => ok(g), err));
        if (aborted) return;

        const root: THREE.Object3D = gltf.scene;
        console.log("[GLTFViewer] GLTF parsed, processing meshes...");

        // 메시 처리 및 COVER 수집
        let meshCount = 0;
        const covers = new Set<string>();
        const categories = new Map<string, string[]>();
        const instances = new Map<string, string[]>(); // COVER별 인스턴스 추적

        root.traverse((node: any) => {
          if (node.isMesh) {
            meshCount++;
            node.frustumCulled = false;

            // 객체 카테고리 분류
            if (node.name) {
              const baseName = node.name.replace(/_\d+$/, "");
              const fullName = node.name; // 인스턴스 번호 포함

              // COVER 메시 수집
              if (baseName.startsWith("RPS_COVER")) {
                covers.add(baseName);

                // 인스턴스 추적
                if (!instances.has(baseName)) {
                  instances.set(baseName, []);
                }
                instances.get(baseName)!.push(fullName);
              }

              // 카테고리별 분류 (이름의 prefix 기준)
              const prefix = baseName.split(/[_\d]/)[0]; // RPS, Sketch, Body 등
              if (prefix && prefix.length > 0) {
                if (!categories.has(prefix)) {
                  categories.set(prefix, []);
                }
                const list = categories.get(prefix)!;
                if (!list.includes(baseName)) {
                  list.push(baseName);
                }
              }
            }

            // 재질 검증 및 수정
            if (!node.material) {
              node.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            }

            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((mat: any) => {
              if (mat.isMaterial) {
                mat.side = THREE.DoubleSide;
                mat.transparent = false;
                mat.opacity = 1.0;
                mat.depthTest = true;
                mat.depthWrite = true;

                // 렌더링 최적화 설정
                mat.precision = "mediump"; // 중간 정밀도 (성능 향상)
                mat.alphaTest = 0.01; // 거의 투명한 픽셀 건너뛰기

                mat.needsUpdate = true;
              }
            });
          }
        });
        console.log("[GLTFViewer] Processed", meshCount, "meshes");

        // COVER 리스트 업데이트
        const coverArray = Array.from(covers).sort();
        setCoverList(coverArray);
        console.log("[GLTFViewer] Found", coverArray.length, "unique COVER parts:", coverArray);

        // 카테고리 정보 업데이트
        setObjectCategories(categories);
        console.log("[GLTFViewer] Object categories:");
        categories.forEach((items, category) => {
          console.log(`  ${category}: ${items.length} objects`);
        });

        // 인스턴스 정보 업데이트
        setCoverInstances(instances);
        console.log("[GLTFViewer] COVER instances:");
        instances.forEach((instanceList, coverName) => {
          if (instanceList.length > 1) {
            console.log(`  ${coverName}: ${instanceList.length} instances`, instanceList);
          }
        });

        // 초기 투명도 설정 (사용자 요청에 따라)
        const initialTransparency = new Map<string, number>();
        initialTransparency.set("RPS_COVER446", 2);
        // initialTransparency.set("RPS_COVER467", 2);
        // initialTransparency.set("RPS_COVER479", 1);
        initialTransparency.set("RPS_COVER182", 2);
        initialTransparency.set("RPS_COVER207", 2);
        initialTransparency.set("RPS_COVER212", 2);
        initialTransparency.set("RPS_COVER221", 2);
        setCoverTransparency(initialTransparency);

        // 바운딩 박스 계산
        const box = new THREE.Box3().setFromObject(root);
        if (box.isEmpty()) {
          throw new Error("Model has no geometry (empty bounding box)");
        }

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        console.log("[GLTFViewer] BBox size:", size.toArray(), "center:", center.toArray());

        // 스케일 정규화 (5 유닛)
        const maxSide = Math.max(size.x, size.y, size.z);
        if (maxSide > 0) {
          const scale = 5 / maxSide;
          root.scale.setScalar(scale);

          // 모델을 그리드 위에 배치 (바닥이 Y=0에 오도록)
          const scaledMin = box.min.clone().multiplyScalar(scale);
          const scaledCenter = center.clone().multiplyScalar(scale);

          root.position.set(
            -scaledCenter.x, // X 중앙 정렬
            -scaledMin.y, // 바닥을 Y=0에 맞춤
            -scaledCenter.z // Z 중앙 정렬
          );

          console.log("[GLTFViewer] Applied scale:", scale);
          console.log("[GLTFViewer] Model positioned on ground at Y=0");
        }

        // 씬에 추가
        scene.add(root);
        modelRef.current = root;
        console.log("[GLTFViewer] Model added to scene");

        // BBox 헬퍼
        const newBox = new THREE.Box3().setFromObject(root);
        const helper = new THREE.Box3Helper(newBox, 0xff00ff);
        scene.add(helper);
        bboxHelperRef.current = helper;

        // 카메라 자동 피팅
        const targetCenter = new THREE.Vector3();
        newBox.getCenter(targetCenter);
        fitCameraToBox(camera, newBox, 1.3);
        controls.target.copy(targetCenter);
        controls.update();
        console.log("[GLTFViewer] Camera fitted to model");

        setStatus("");
      } catch (e: any) {
        if (aborted) return;
        console.error("[GLTFViewer] Load error:", e);
        setStatus(`Error: ${e?.message || e}`);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [src, ready]);

  // ========== 3) COVER 투명도 적용 (coverTransparency 변경 시) ==========
  useEffect(() => {
    if (!modelRef.current) return;

    modelRef.current.traverse((node: any) => {
      if (node.isMesh && node.name && node.name.startsWith("RPS_COVER")) {
        const fullName = node.name; // 인스턴스 번호 포함 (예: RPS_COVER479_1)
        const baseName = fullName.replace(/_\d+$/, "");

        // 개별 인스턴스 투명도 확인, 없으면 기본 COVER 투명도 사용
        const level = coverTransparency.get(fullName) || coverTransparency.get(baseName) || 0;

        // 레벨에 따른 투명도 설정
        // 0: 불투명 (opacity 1.0)
        // 1: 약한 반투명 (opacity 0.6)
        // 2: 강한 반투명 (opacity 0.3)
        const opacityMap = [1.0, 0.6, 0.3];
        const opacity = opacityMap[level];
        const isTransparent = level > 0;

        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((mat: any) => {
          if (mat.isMaterial) {
            mat.transparent = isTransparent;
            mat.opacity = opacity;
            mat.depthWrite = !isTransparent;

            // 투명도 최적화: alphaTest로 거의 보이지 않는 픽셀 건너뛰기
            if (isTransparent) {
              mat.alphaTest = 0.05;
              // 투명 객체 렌더링 순서 (뒤쪽부터 그리기)
              node.renderOrder = level; // level이 높을수록 나중에 렌더링
            } else {
              mat.alphaTest = 0.01;
              node.renderOrder = 0;
            }

            mat.needsUpdate = true;
          }
        });
      }
    });

    const transparentCount = Array.from(coverTransparency.values()).filter((v) => v > 0).length;
    console.log("[GLTFViewer] Applied transparency to", transparentCount, "COVER parts");
  }, [coverTransparency]);

  // ========== 4) 객체 숨기기/보이기 (hiddenObjects 변경 시) ==========
  useEffect(() => {
    if (!modelRef.current) return;

    modelRef.current.traverse((node: any) => {
      if (node.isMesh && node.name) {
        const fullName = node.name;
        const baseName = fullName.replace(/_\d+$/, "");

        // 개별 인스턴스 숨김 확인, 없으면 기본 이름 숨김 확인
        const shouldHide = hiddenObjects.has(fullName) || hiddenObjects.has(baseName);
        node.visible = !shouldHide;
      }
    });

    console.log("[GLTFViewer] Hidden objects:", hiddenObjects.size);
  }, [hiddenObjects]);

  // 투명도 레벨 변경 핸들러 (0 -> 1 -> 2 -> 0 순환)
  const toggleCoverTransparency = (coverName: string) => {
    setCoverTransparency((prev) => {
      const next = new Map(prev);
      const currentLevel = next.get(coverName) || 0;
      const nextLevel = (currentLevel + 1) % 3; // 0 -> 1 -> 2 -> 0

      if (nextLevel === 0) {
        next.delete(coverName);
      } else {
        next.set(coverName, nextLevel);
      }
      return next;
    });
  };

  // 전체 투명 / 전체 불투명
  const setAllTransparent = () => {
    const allTransparent = new Map<string, number>();
    coverList.forEach((name) => allTransparent.set(name, 2));
    setCoverTransparency(allTransparent);
  };
  const setAllOpaque = () => setCoverTransparency(new Map());

  // 객체 숨기기/보이기 토글
  const toggleObjectVisibility = (objectName: string) => {
    setHiddenObjects((prev) => {
      const next = new Set(prev);
      if (next.has(objectName)) {
        next.delete(objectName);
      } else {
        next.add(objectName);
      }
      return next;
    });
  };

  // 카테고리 전체 숨기기/보이기
  const toggleCategoryVisibility = (category: string) => {
    const objects = objectCategories.get(category) || [];
    const allHidden = objects.every((obj) => hiddenObjects.has(obj));

    setHiddenObjects((prev) => {
      const next = new Set(prev);
      if (allHidden) {
        // 모두 숨겨져 있으면 -> 모두 보이기
        objects.forEach((obj) => next.delete(obj));
      } else {
        // 일부 또는 전체 보이면 -> 모두 숨기기
        objects.forEach((obj) => next.add(obj));
      }
      return next;
    });
  };

  // PALLET 그룹 찾기 및 생성
  const findPalletGroup = () => {
    if (!modelRef.current || !sceneRef.current) return;

    if (palletGroupRef.current) {
      console.log("[PALLET] Already found");
      return;
    }

    // PALLET로 시작하는 모든 메시 찾기
    const palletMeshes: THREE.Object3D[] = [];
    modelRef.current.traverse((node: any) => {
      if (node.isMesh && node.name) {
        const name = node.name.toUpperCase();
        if (name.startsWith("PALLET")) {
          palletMeshes.push(node);
          console.log("[PALLET] Found mesh:", node.name);
        }
      }
    });

    if (palletMeshes.length === 0) {
      console.log("[PALLET] No PALLET meshes found!");
      return;
    }

    // PALLET 그룹 생성
    const palletGroup = new THREE.Group();
    palletGroup.name = "PALLET_Group";

    // PALLET 메시들을 그룹으로 이동
    palletMeshes.forEach((mesh) => {
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      mesh.getWorldQuaternion(worldQuat);
      mesh.getWorldScale(worldScale);

      mesh.removeFromParent();
      mesh.position.copy(worldPos);
      mesh.quaternion.copy(worldQuat);
      mesh.scale.copy(worldScale);
      palletGroup.add(mesh);
    });

    sceneRef.current.add(palletGroup);
    palletGroupRef.current = palletGroup;
    console.log("[PALLET] Group created with", palletMeshes.length, "meshes");
  };

  // PALLET 이동
  const movePallet = (axis: "x" | "y" | "z", direction: number) => {
    if (!palletGroupRef.current) {
      findPalletGroup();
      if (!palletGroupRef.current) return;
    }

    const step = 0.1; // 0.1 단위 = 10cm
    const newPos = { ...palletPosition };
    newPos[axis] += direction * step;

    // 범위 제한 (-1 ~ 1) = -1m ~ 1m
    newPos[axis] = Math.max(-1, Math.min(1, newPos[axis]));

    palletGroupRef.current.position.set(newPos.x, newPos.y, newPos.z);
    setPalletPosition(newPos);
    console.log("[PALLET] Moved to", axis.toUpperCase(), ":", newPos[axis].toFixed(2), "m (", (newPos[axis] * 100).toFixed(0), "cm)");
  };

  // 버튼 공통 스타일
  const buttonStyle: React.CSSProperties = {
    flex: 1,
    padding: "8px",
    fontSize: 11,
    fontWeight: 600,
    background: "#5c7cfa",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    transition: "background 0.2s",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        margin: 0,
        padding: 0,
      }}
    >
      {/* 3D 뷰어 */}
      <div
        style={{
          width: showPanel ? "80%" : "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          transition: "width 0.3s ease",
        }}
      >
        <div
          ref={mountRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            touchAction: "none",
          }}
        />
        {status && (
          <div
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              padding: "8px 12px",
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
              fontSize: 13,
              borderRadius: 6,
              pointerEvents: "none",
            }}
          >
            {status}
          </div>
        )}

        {/* 패널 토글 버튼 */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            padding: "8px 16px",
            background: showPanel ? "#4a9eff" : "#666",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            transition: "background 0.2s",
            zIndex: 1000,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = showPanel ? "#3a8eef" : "#555")}
          onMouseLeave={(e) => (e.currentTarget.style.background = showPanel ? "#4a9eff" : "#666")}
        >
          {showPanel ? "Hide Panel ▶" : "◀ Show Panel"}
        </button>
      </div>

      {/* 우측 패널 - 20% */}
      {showPanel && (
        <div
          style={{
            width: "20%",
            height: "100%",
            background: "#1e1e23",
            color: "#fff",
            overflowY: "auto",
            padding: "16px",
            borderLeft: "1px solid #444",
            boxSizing: "border-box",
            animation: "slideIn 0.3s ease",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600 }}>Control Panel</h3>
          <div style={{ fontSize: 12, color: "#ccc", marginBottom: 16 }}>RPS GLTF Viewer</div>

          {/* PALLET 테스트 컨트롤 */}
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #333" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#fff" }}>PALLET Test Control</div>
            <div style={{ fontSize: 10, color: "#777", marginBottom: 12 }}>PALLET 객체 X, Y, Z 이동 테스트</div>

            {/* PALLET 찾기 버튼 */}
            <button
              onClick={findPalletGroup}
              style={{
                width: "100%",
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 12,
                fontWeight: 600,
                background: palletGroupRef.current ? "#51cf66" : "#4a9eff",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              {palletGroupRef.current ? "✅ PALLET Found" : "🔍 Find PALLET"}
            </button>

            {/* 위치 표시 */}
            <div style={{ fontSize: 11, color: "#999", marginBottom: 12, textAlign: "center" }}>
              Position:
              <br />
              X: {palletPosition.x.toFixed(2)}m ({(palletPosition.x * 100).toFixed(0)}cm)
              <br />
              Y: {palletPosition.y.toFixed(2)}m ({(palletPosition.y * 100).toFixed(0)}cm)
              <br />
              Z: {palletPosition.z.toFixed(2)}m ({(palletPosition.z * 100).toFixed(0)}cm)
            </div>

            {/* X축 컨트롤 */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>X Axis (좌/우)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => movePallet("x", -1)} style={buttonStyle}>
                  ← -10cm
                </button>
                <button onClick={() => movePallet("x", 1)} style={buttonStyle}>
                  +10cm →
                </button>
              </div>
            </div>

            {/* Y축 컨트롤 */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>Y Axis (위/아래)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => movePallet("y", -1)} style={buttonStyle}>
                  ↓ -10cm
                </button>
                <button onClick={() => movePallet("y", 1)} style={buttonStyle}>
                  +10cm ↑
                </button>
              </div>
            </div>

            {/* Z축 컨트롤 */}
            <div>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>Z Axis (앞/뒤)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => movePallet("z", -1)} style={buttonStyle}>
                  ↓ -10cm
                </button>
                <button onClick={() => movePallet("z", 1)} style={buttonStyle}>
                  +10cm ↑
                </button>
              </div>
            </div>
          </div>

          {/* 객체 카테고리 숨기기 */}
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #333" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#fff" }}>Object Categories</div>
            <div style={{ fontSize: 10, color: "#777", marginBottom: 8 }}>카테고리별 객체 숨기기/보이기</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Array.from(objectCategories.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([category, objects]) => {
                  const hiddenCount = objects.filter((obj) => hiddenObjects.has(obj)).length;
                  const allHidden = hiddenCount === objects.length;
                  const someHidden = hiddenCount > 0 && hiddenCount < objects.length;

                  return (
                    <div
                      key={category}
                      onClick={() => toggleCategoryVisibility(category)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11,
                        cursor: "pointer",
                        padding: "5px 8px",
                        background: allHidden ? "#1a1a22" : someHidden ? "#252530" : "transparent",
                        borderRadius: 3,
                        border: `1px solid ${allHidden ? "#555" : someHidden ? "#666" : "#333"}`,
                        opacity: allHidden ? 0.5 : 1,
                      }}
                    >
                      <span style={{ color: allHidden ? "#888" : "#ccc" }}>{category}</span>
                      <span style={{ fontSize: 9, color: "#777" }}>
                        {allHidden ? "숨김" : someHidden ? `${hiddenCount}/${objects.length}` : objects.length}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 전체 제어 버튼 */}
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={setAllTransparent}
              style={{
                padding: "6px 12px",
                marginRight: 8,
                fontSize: 12,
                background: "#4a9eff",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              All Transparent
            </button>
            <button
              onClick={setAllOpaque}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                background: "#666",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              All Opaque
            </button>
          </div>

          {/* COVER 리스트 */}
          <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>COVER Parts ({coverList.length})</div>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 12, lineHeight: 1.4 }}>클릭: 0(불투명) → 1(약한 반투명) → 2(강한 반투명) → 0</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {coverList.map((coverName) => {
              const level = coverTransparency.get(coverName) || 0;
              const labels = ["불투명", "약함", "강함"];
              const colors = ["#666", "#88ccff", "#4a9eff"];
              const instances = coverInstances.get(coverName) || [];
              const hasMultipleInstances = instances.length > 1;
              const isExpanded = expandedCovers.has(coverName);

              return (
                <div key={coverName} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* 메인 COVER */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {hasMultipleInstances && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCovers((prev) => {
                            const next = new Set(prev);
                            if (next.has(coverName)) {
                              next.delete(coverName);
                            } else {
                              next.add(coverName);
                            }
                            return next;
                          });
                        }}
                        style={{
                          fontSize: 10,
                          cursor: "pointer",
                          color: "#888",
                          minWidth: 14,
                          textAlign: "center",
                        }}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </div>
                    )}
                    <div
                      onClick={() => toggleCoverTransparency(coverName)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: "6px 8px",
                        background: level > 0 ? "#2a2a35" : "transparent",
                        borderRadius: 3,
                        transition: "background 0.15s",
                        border: `1px solid ${level > 0 ? colors[level] : "#333"}`,
                        flex: 1,
                      }}
                    >
                      <span style={{ color: level > 0 ? colors[level] : "#ccc" }}>
                        {coverName} {hasMultipleInstances && `(${instances.length})`}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: colors[level],
                          fontWeight: level > 0 ? 600 : 400,
                          minWidth: 40,
                          textAlign: "right",
                        }}
                      >
                        {labels[level]}
                      </span>
                    </div>
                  </div>

                  {/* 개별 인스턴스 */}
                  {isExpanded && hasMultipleInstances && (
                    <div style={{ marginLeft: 20, display: "flex", flexDirection: "column", gap: 2 }}>
                      {instances.map((instanceName) => {
                        const instLevel = coverTransparency.get(instanceName) || 0;
                        return (
                          <div
                            key={instanceName}
                            onClick={() => toggleCoverTransparency(instanceName)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: 11,
                              cursor: "pointer",
                              padding: "4px 6px",
                              background: instLevel > 0 ? "#1a1a25" : "transparent",
                              borderRadius: 2,
                              border: `1px solid ${instLevel > 0 ? colors[instLevel] : "#222"}`,
                              opacity: 0.9,
                            }}
                          >
                            <span style={{ color: instLevel > 0 ? colors[instLevel] : "#999" }}>{instanceName}</span>
                            <span
                              style={{
                                fontSize: 9,
                                color: colors[instLevel],
                                fontWeight: instLevel > 0 ? 600 : 400,
                                minWidth: 30,
                                textAlign: "right",
                              }}
                            >
                              {labels[instLevel]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GLTFViewer;

/* ========== Utils ========== */

function disposeObject(obj: THREE.Object3D | null) {
  if (!obj) return;
  obj.traverse((node: any) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => mat.dispose());
    }
  });
}

function fitCameraToBox(camera: THREE.PerspectiveCamera, box: THREE.Box3, padding = 1.2) {
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
