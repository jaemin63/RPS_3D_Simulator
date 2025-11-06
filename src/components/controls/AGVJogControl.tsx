import React from "react";

interface AGVJogControlProps {
  agvZPosition: number;
  agvRotation: number;
  agvPivot: { x: number; y: number; z: number };
  onMoveZ: (direction: number) => void;
  onSetZ: (value: number) => void;
  onRotate: (degrees: number) => void;
  onSetRotation: (degrees: number) => void;
  onUpdatePivot: (axis: "x" | "y" | "z", value: number) => void;
}

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

export const AGVJogControl: React.FC<AGVJogControlProps> = ({
  agvZPosition,
  agvRotation,
  agvPivot,
  onMoveZ,
  onSetZ,
  onRotate,
  onSetRotation,
  onUpdatePivot,
}) => {
  return (
    <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #333" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#fff" }}>AGV Jog Control</div>

      {/* Z축 이동 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Z Position (mm)</div>
        <div style={{ fontSize: 10, color: "#999", marginBottom: 8, textAlign: "center" }}>
          {agvZPosition.toFixed(3)}m ({(agvZPosition * 1000).toFixed(0)}mm)
        </div>
        <input
          type="number"
          value={(agvZPosition * 1000).toFixed(0)}
          onChange={(e) => {
            const mmValue = parseFloat(e.target.value) || 0;
            onSetZ(mmValue / 1000);
          }}
          style={{
            width: "100%",
            padding: "6px 8px",
            fontSize: 11,
            background: "#2a2a35",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            textAlign: "center",
            marginBottom: 8,
          }}
          step="1"
          min="-5000"
          max="5000"
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <button onClick={() => onMoveZ(-1)} style={buttonStyle}>
            ◀ -1mm
          </button>
          <button onClick={() => onMoveZ(1)} style={buttonStyle}>
            +1mm ▶
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <button onClick={() => onMoveZ(-10)} style={buttonStyle}>
            ◀ -10mm
          </button>
          <button onClick={() => onMoveZ(10)} style={buttonStyle}>
            +10mm ▶
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onMoveZ(-100)} style={buttonStyle}>
            ◀ -100mm
          </button>
          <button onClick={() => onMoveZ(100)} style={buttonStyle}>
            +100mm ▶
          </button>
        </div>
      </div>

      {/* Pivot 설정 */}
      <div style={{ marginBottom: 12, paddingTop: 12, borderTop: "1px solid #444" }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Rotation Pivot (mm)</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#777" }}>X</div>
            <input
              type="number"
              value={(agvPivot.x * 1000).toFixed(1)}
              onChange={(e) => onUpdatePivot("x", parseFloat(e.target.value || "0") / 1000)}
              style={{
                width: "100%",
                padding: "4px",
                fontSize: 10,
                background: "#2a2a35",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 3,
                textAlign: "center",
              }}
              step="0.1"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#777" }}>Y</div>
            <input
              type="number"
              value={(agvPivot.y * 1000).toFixed(1)}
              onChange={(e) => onUpdatePivot("y", parseFloat(e.target.value || "0") / 1000)}
              style={{
                width: "100%",
                padding: "4px",
                fontSize: 10,
                background: "#2a2a35",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 3,
                textAlign: "center",
              }}
              step="0.1"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#777" }}>Z</div>
            <input
              type="number"
              value={(agvPivot.z * 1000).toFixed(1)}
              onChange={(e) => onUpdatePivot("z", parseFloat(e.target.value || "0") / 1000)}
              style={{
                width: "100%",
                padding: "4px",
                fontSize: 10,
                background: "#2a2a35",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 3,
                textAlign: "center",
              }}
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* 회전 */}
      <div style={{ paddingTop: 12, borderTop: "1px solid #444" }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Rotation (Y-Axis, degrees)</div>
        <div style={{ fontSize: 10, color: "#999", marginBottom: 8, textAlign: "center" }}>
          {agvRotation.toFixed(1)}°
        </div>
        <input
          type="number"
          value={agvRotation.toFixed(1)}
          onChange={(e) => onSetRotation(parseFloat(e.target.value) || 0)}
          style={{
            width: "100%",
            padding: "6px 8px",
            fontSize: 11,
            background: "#2a2a35",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            textAlign: "center",
            marginBottom: 8,
          }}
          step="0.1"
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <button onClick={() => onRotate(-1)} style={buttonStyle}>
            ↺ -1°
          </button>
          <button onClick={() => onRotate(1)} style={buttonStyle}>
            +1° ↻
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <button onClick={() => onRotate(-5)} style={buttonStyle}>
            ↺ -5°
          </button>
          <button onClick={() => onRotate(5)} style={buttonStyle}>
            +5° ↻
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <button onClick={() => onRotate(-45)} style={buttonStyle}>
            ↺ -45°
          </button>
          <button onClick={() => onRotate(45)} style={buttonStyle}>
            +45° ↻
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onRotate(-90)} style={buttonStyle}>
            ↺ -90°
          </button>
          <button onClick={() => onRotate(90)} style={buttonStyle}>
            +90° ↻
          </button>
        </div>
      </div>
    </div>
  );
};
