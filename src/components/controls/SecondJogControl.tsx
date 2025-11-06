import React from "react";

interface SecondJogControlProps {
  secondLocalZ: number;
  onMove: (direction: number) => void;
  onSetPosition: (value: number) => void;
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

export const SecondJogControl: React.FC<SecondJogControlProps> = ({ secondLocalZ, onMove, onSetPosition }) => {
  return (
    <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #333" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#fff" }}>SECOND Jog Control</div>
      <div style={{ fontSize: 10, color: "#777", marginBottom: 12 }}>로컬 방향 앞뒤 이동</div>

      <div style={{ fontSize: 10, color: "#999", marginBottom: 8, textAlign: "center" }}>
        {secondLocalZ.toFixed(3)}m ({(secondLocalZ * 1000).toFixed(0)}mm)
      </div>

      <input
        type="number"
        value={(secondLocalZ * 1000).toFixed(0)}
        onChange={(e) => {
          const mmValue = parseFloat(e.target.value) || 0;
          onSetPosition(mmValue / 1000);
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
        min="-2000"
        max="2000"
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <button onClick={() => onMove(-1)} style={buttonStyle}>
          ◀ 뒤 -1mm
        </button>
        <button onClick={() => onMove(1)} style={buttonStyle}>
          앞 +1mm ▶
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <button onClick={() => onMove(-10)} style={buttonStyle}>
          ◀ 뒤 -10mm
        </button>
        <button onClick={() => onMove(10)} style={buttonStyle}>
          앞 +10mm ▶
        </button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onMove(-100)} style={buttonStyle}>
          ◀ 뒤 -100mm
        </button>
        <button onClick={() => onMove(100)} style={buttonStyle}>
          앞 +100mm ▶
        </button>
      </div>
    </div>
  );
};
