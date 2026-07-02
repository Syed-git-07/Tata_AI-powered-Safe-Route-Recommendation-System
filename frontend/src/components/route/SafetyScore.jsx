import { useMemo } from "react";
import { RISK_SCORE_COLOR } from "../../utils/constants";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

const CIRCUMFERENCE = 2 * Math.PI * 52;

export default function SafetyScore({ score, riskLevel, label = "Overall Safety" }) {
  const color = RISK_SCORE_COLOR(score);
  const offset = useMemo(
    () => CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE,
    [score]
  );

  const Icon =
    riskLevel === "Low" ? ShieldCheck :
    riskLevel === "High" ? ShieldAlert :
    Shield;

  return (
    <div className="safety-score-card">
      <div className="score-gauge-wrapper">
        <svg className="score-ring" viewBox="0 0 120 120" width="120" height="120">
          {/* Background ring */}
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="10" />
          {/* Progress ring */}
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="score-center">
          <span className="score-value" style={{ color }}>{score}</span>
          <span className="score-unit">/100</span>
        </div>
      </div>

      <div className="score-meta">
        <p className="score-label">{label}</p>
        <div className={`risk-badge risk-${riskLevel?.toLowerCase()}`}>
          <Icon size={13} />
          <span>{riskLevel} Risk</span>
        </div>
      </div>
    </div>
  );
}
