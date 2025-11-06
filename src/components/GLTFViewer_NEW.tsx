import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

// Hooks
import { useAGVControl } from "../hooks/useAGVControl";
import { useLiftControl } from "../hooks/useLiftControl";
import { useSecondControl } from "../hooks/useSecondControl";
import { useSimulation } from "../hooks/useSimulation";
import { useAnimationUpdater } from "../hooks/useAnimationUpdater";

// Utils
import { disposeObject, fitCameraToBox, createPivotMarker } from "../utils/threeUtils";
import { createAGVGroup } from "../utils/agvGroupUtils";

// Components
import { SimulationControl, AGVJogControl, LiftJogControl, SecondJogControl } from "./controls";

type Props = { src: string; background?: number; helpers?: boolean };

const GLTFViewer: React.FC<Props> = ({ src, background = 0x111214, helpers = true }) => {
  // Three.js refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const bboxHelperRef = useRef<THREE.Box3Helper | null>(null);
  const statsRef = useRef<any>(null);

  // Model state
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  // Cover & Object state
  const [coverList, setCoverList] = useState<string[]>([]);
  const [coverTransparency, setCoverTransparency] = useState<Map<string, number>>(new Map());
  const [hiddenObjects, setHiddenObjects] = useState<Set<string>>(new Set());
  const [objectCategories, setObjectCategories] = useState<Map<string, string[]>>(new Map());
  const [coverInstances, setCoverInstances] = useState<Map<string, string[]>>(new Map());
  const [expandedCovers, setExpandedCovers] = useState<Set<string>>(new Set());
  const [showCoverList, setShowCoverList] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Custom hooks - 먼저 animationUpdater를 만들어야 함
  const tempAnimationRef = useRef({});

  const agvControl = useAGVControl(tempAnimationRef);
  const liftControl = useLiftControl(tempAnimationRef);
  const secondControl = useSecondControl(tempAnimationRef);

  // Animation updater
  const { animationRef, updateAnimations } = useAnimationUpdater(
    {
      agvGroupRef: agvControl.agvGroupRef,
      liftGroupRef: liftControl.liftGroupRef,
      secondGroupRef: secondControl.secondGroupRef,
      currentAgvZRef: agvControl.currentAgvZRef,
      currentAgvRotationRef: agvControl.currentAgvRotationRef,
      currentLiftYRef: liftControl.currentLiftYRef,
      currentSecondZRef: secondControl.currentSecondZRef,
    },
    {
      setAgvZPosition: agvControl.setAgvZPosition,
      setAgvRotation: agvControl.setAgvRotation,
      setLiftYPosition: liftControl.setLiftYPosition,
      setSecondLocalZ: secondControl.setSecondLocalZ,
    }
  );

  // Simulation
  const simulation = useSimulation({
    setAgvZPositionDirect: agvControl.setAgvZPositionDirect,
    setAgvRotationDirect: agvControl.setAgvRotationDirect,
    setLiftYPositionDirect: liftControl.setLiftYPositionDirect,
    setSecondLocalZDirect: secondControl.setSecondLocalZDirect,
  });

  // Update pivot marker
  const updatePivotMarker = (position: { x: number; y: number; z: number }) => {
    if (!sceneRef.current) return;

    if (agvControl.agvPivotMarkerRef.current) {
      sceneRef.current.remove(agvControl.agvPivotMarkerRef.current);
      agvControl.agvPivotMarkerRef.current.geometry.dispose();
      (agvControl.agvPivotMarkerRef.current.material as THREE.Material).dispose();
      agvControl.agvPivotMarkerRef.current = null;
    }

    const marker = createPivotMarker(position);
    sceneRef.current.add(marker);
    agvControl.agvPivotMarkerRef.current = marker;
  };

  // ========== Three.js 초기화 ==========
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.sortObjects = true;

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

    scene.add(new THREE.AmbientLight(0xffffff, 2.0));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 10, 5);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-5, 5, -5);
    scene.add(dirLight2);
    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight3.position.set(0, -5, 0);
    scene.add(dirLight3);

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

    const stats = new Stats();
    stats.dom.style.position = "absolute";
    stats.dom.style.left = "12px";
    stats.dom.style.top = "12px";
    stats.dom.style.zIndex = "1000";
    mount.appendChild(stats.dom);
    statsRef.current = stats;

    const ro = new ResizeObserver(updateSize);
    ro.observe(mount);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      updateAnimations();
      controls.update();
      renderer.render(scene, camera);
      stats.update();
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
  }, [background, helpers, updateAnimations]);

  // ========== GLTF 모델 로드 ==========
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

        if (bboxHelperRef.current) {
          scene.remove(bboxHelperRef.current);
          bboxHelperRef.current = null;
        }
        if (modelRef.current) {
          scene.remove(modelRef.current);
          disposeObject(modelRef.current);
          modelRef.current = null;
        }

        const loader = new GLTFLoader();
        const draco = new DRACOLoader();
        draco.setDecoderPath("/draco/");
        loader.setDRACOLoader(draco);

        try {
          const mod: any = await import("three/examples/jsm/libs/meshopt_decoder.module.js");
          loader.setMeshoptDecoder(mod.default ?? mod);
        } catch {}

        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} on ${src}`);
        const buf = await res.arrayBuffer();
        const base = src.substring(0, src.lastIndexOf("/") + 1);

        const gltf = await new Promise<any>((ok, err) => loader.parse(buf, base, (g) => ok(g), err));
        if (aborted) return;

        const root: THREE.Object3D = gltf.scene;
        console.log("[GLTFViewer] GLTF parsed, processing meshes...");

        let meshCount = 0;
        const covers = new Set<string>();
        const categories = new Map<string, string[]>();
        const instances = new Map<string, string[]>();

        root.traverse((node: any) => {
          if (node.isMesh) {
            meshCount++;
            node.frustumCulled = false;

            if (node.name) {
              const baseName = node.name.replace(/_\d+$/, "");
              const fullName = node.name;

              if (baseName.startsWith("RPS_COVER")) {
                covers.add(baseName);
                if (!instances.has(baseName)) {
                  instances.set(baseName, []);
                }
                instances.get(baseName)!.push(fullName);
              }

              const prefix = baseName.split(/[_\d]/)[0];
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
                mat.precision = "mediump";
                mat.alphaTest = 0.01;
                mat.needsUpdate = true;
              }
            });
          }
        });
        console.log("[GLTFViewer] Processed", meshCount, "meshes");

        const coverArray = Array.from(covers).sort();
        setCoverList(coverArray);
        setObjectCategories(categories);
        setCoverInstances(instances);
        setCoverTransparency(new Map());

        const box = new THREE.Box3().setFromObject(root);
        if (box.isEmpty()) {
          throw new Error("Model has no geometry (empty bounding box)");
        }

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxSide = Math.max(size.x, size.y, size.z);
        if (maxSide > 0) {
          const scale = 5 / maxSide;
          root.scale.setScalar(scale);

          const scaledMin = box.min.clone().multiplyScalar(scale);
          const scaledCenter = center.clone().multiplyScalar(scale);

          root.position.set(-scaledCenter.x, -scaledMin.y, -scaledCenter.z);
        }

        scene.add(root);
        modelRef.current = root;

        const newBox = new THREE.Box3().setFromObject(root);
        const helper = new THREE.Box3Helper(newBox, 0xff00ff);
        scene.add(helper);
        bboxHelperRef.current = helper;

        const targetCenter = new THREE.Vector3();
        newBox.getCenter(targetCenter);
        fitCameraToBox(camera, newBox, 1.3);
        controls.target.copy(targetCenter);
        controls.update();

        // AGV 그룹 자동 생성
        const result = createAGVGroup({
          scene,
          agvPivot: agvControl.agvPivot,
          updatePivotMarkerCallback: updatePivotMarker,
        });

        agvControl.agvGroupRef.current = result.agvGroup;
        liftControl.liftGroupRef.current = result.liftGroup;
        secondControl.secondGroupRef.current = result.secondGroup;

        if (result.liftGroup) {
          liftControl.setLiftYPosition(0);
        }
        if (result.secondGroup) {
          secondControl.setSecondLocalZ(0);
        }

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

  // ========== Cover transparency 적용 ==========
  useEffect(() => {
    if (!modelRef.current) return;

    modelRef.current.traverse((node: any) => {
      if (!node.isMesh || !node.name) return;

      const baseName = node.name.replace(/_\d+$/, "");
      if (!baseName.startsWith("RPS_COVER")) return;

      const alpha = coverTransparency.get(baseName) ?? 1.0;
      const materials = Array.isArray(node.material) ? node.material : [node.material];

      materials.forEach((mat: any) => {
        if (!mat.isMaterial) return;
        const shouldBeTransparent = alpha < 1.0;
        mat.transparent = shouldBeTransparent;
        mat.opacity = alpha;
        mat.depthWrite = !shouldBeTransparent;
        mat.needsUpdate = true;
      });
    });
  }, [coverTransparency]);

  // ========== Object visibility 적용 ==========
  useEffect(() => {
    if (!sceneRef.current) return;

    sceneRef.current.traverse((node: any) => {
      if (!node.isMesh || !node.name) return;
      const baseName = node.name.replace(/_\d+$/, "");
      node.visible = !hiddenObjects.has(baseName);
    });
  }, [hiddenObjects]);

  // ========== Render ==========
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {status && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            color: "#fff",
            fontSize: 14,
            background: "rgba(0,0,0,0.7)",
            padding: "12px 20px",
            borderRadius: 6,
          }}
        >
          {status}
        </div>
      )}

      {showPanel && ready && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 280,
            maxHeight: "calc(100vh - 24px)",
            overflowY: "auto",
            background: "#1e1e28",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 16,
            fontSize: 12,
            color: "#ccc",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          <SimulationControl isSimulating={simulation.isSimulating} onStart={simulation.startSimulation} onStop={simulation.stopSimulation} />

          <AGVJogControl
            agvZPosition={agvControl.agvZPosition}
            agvRotation={agvControl.agvRotation}
            agvPivot={agvControl.agvPivot}
            onMoveZ={agvControl.moveAgvZ}
            onSetZPosition={agvControl.setAgvZPosition}
            onRotate={agvControl.rotateAgv}
            onSetRotation={agvControl.setAgvRotation}
            onUpdatePivot={(axis, value) => {
              agvControl.setAgvPivot({ ...agvControl.agvPivot, [axis]: value });
              updatePivotMarker({ ...agvControl.agvPivot, [axis]: value });
            }}
          />

          <LiftJogControl liftYPosition={liftControl.liftYPosition} onMove={liftControl.moveLiftY} onSetPosition={liftControl.setLiftYPosition} />

          <SecondJogControl
            secondLocalZ={secondControl.secondLocalZ}
            onMove={secondControl.moveSecondZ}
            onSetPosition={secondControl.setSecondLocalZ}
          />

          {/* Object Categories */}
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #333" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#fff" }}>Object Categories</div>
            {Array.from(objectCategories.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, objects]) => {
                const isExpanded = expandedCategories.has(category);
                return (
                  <div key={category} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        background: "#2a2a35",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setExpandedCategories((prev) => {
                          const next = new Set(prev);
                          if (next.has(category)) {
                            next.delete(category);
                          } else {
                            next.add(category);
                          }
                          return next;
                        });
                      }}
                    >
                      <span style={{ fontSize: 10, color: "#999" }}>{isExpanded ? "▼" : "▶"}</span>
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>
                        {category} ({objects.length})
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 4, marginLeft: 16 }}>
                        {objects.map((objName) => {
                          const isHidden = hiddenObjects.has(objName);
                          return (
                            <div
                              key={objName}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 8px",
                                fontSize: 10,
                              }}
                            >
                              <span style={{ flex: 1, color: "#aaa" }}>{objName}</span>
                              <button
                                onClick={() => {
                                  setHiddenObjects((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(objName)) {
                                      next.delete(objName);
                                    } else {
                                      next.add(objName);
                                    }
                                    return next;
                                  });
                                }}
                                style={{
                                  padding: "2px 8px",
                                  fontSize: 9,
                                  background: isHidden ? "#555" : "#5c7cfa",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 3,
                                  cursor: "pointer",
                                }}
                              >
                                {isHidden ? "SHOW" : "HIDE"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* COVER Parts */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>COVER Parts ({coverList.length})</div>
              <button
                onClick={() => setShowCoverList(!showCoverList)}
                style={{
                  padding: "4px 10px",
                  fontSize: 10,
                  background: "#5c7cfa",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {showCoverList ? "접기" : "펼치기"}
              </button>
            </div>

            {showCoverList && (
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {coverList.map((coverName) => {
                  const alpha = coverTransparency.get(coverName) ?? 1.0;
                  const instances = coverInstances.get(coverName) || [];
                  const isExpanded = expandedCovers.has(coverName);

                  return (
                    <div
                      key={coverName}
                      style={{
                        marginBottom: 10,
                        padding: 8,
                        background: "#2a2a35",
                        borderRadius: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                          cursor: "pointer",
                        }}
                        onClick={() => {
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
                      >
                        <span style={{ fontSize: 9, color: "#999" }}>{isExpanded ? "▼" : "▶"}</span>
                        <span style={{ flex: 1, fontSize: 10, fontWeight: 600 }}>{coverName}</span>
                        <span style={{ fontSize: 9, color: "#777" }}>({instances.length})</span>
                      </div>

                      {isExpanded && <div style={{ fontSize: 8, color: "#666", marginBottom: 6, marginLeft: 16 }}>{instances.join(", ")}</div>}

                      <div style={{ marginTop: 6 }}>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={alpha}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCoverTransparency((prev) => {
                              const next = new Map(prev);
                              next.set(coverName, val);
                              return next;
                            });
                          }}
                          style={{
                            width: "100%",
                            cursor: "pointer",
                          }}
                        />
                        <div
                          style={{
                            fontSize: 9,
                            color: "#999",
                            textAlign: "center",
                            marginTop: 4,
                          }}
                        >
                          Opacity: {(alpha * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          position: "absolute",
          top: 12,
          right: showPanel ? 304 : 12,
          padding: "8px 12px",
          fontSize: 11,
          background: "#5c7cfa",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          transition: "right 0.3s",
          zIndex: 1001,
        }}
      >
        {showPanel ? "◀" : "▶"}
      </button>
    </div>
  );
};

export default GLTFViewer;
