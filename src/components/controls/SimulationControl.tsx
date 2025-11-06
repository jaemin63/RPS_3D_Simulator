import React from "react";

interface SimulationControlProps {
  isSimulating: boolean;
  onStart: () => void;
  onStop: () => void;
}

const buttonStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px",
  fontSize: 11,
  fontWeight: 600,
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  transition: "background 0.2s",
};

export const SimulationControl: React.FC<SimulationControlProps> = ({ isSimulating, onStart, onStop }) => {
  return (
    <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #333" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#fff" }}>Simulation</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onStart}
          disabled={isSimulating}
          style={{
            ...buttonStyle,
            background: isSimulating ? "#666" : "#28a745",
            cursor: isSimulating ? "not-allowed" : "pointer",
            opacity: isSimulating ? 0.6 : 1,
          }}
        >
          {isSimulating ? "실행 중..." : "▶ 시뮬레이션 시작"}
        </button>
        {isSimulating && (
          <button
            onClick={onStop}
            style={{
              ...buttonStyle,
              background: "#dc3545",
            }}
          >
            ■ 중지
          </button>
        )}
      </div>
    </div>
  );
};
