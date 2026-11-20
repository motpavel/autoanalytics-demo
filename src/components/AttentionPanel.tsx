import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, Info } from "lucide-react";
import type { Insight, TabId } from "../lib/types";
import { Panel } from "./Panel";

const iconByType = {
  risk: Clock3,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

type AttentionPanelProps = {
  insights: Insight[];
  onOpenTab: (tab: TabId) => void;
  title?: string;
  variant?: "list" | "strip";
};

export function AttentionPanel({ insights, onOpenTab, title = "Что требует внимания", variant = "list" }: AttentionPanelProps) {
  if (!insights.length) return null;
  const alerts = insights.filter((insight) => insight.type === "risk" || insight.type === "warning").length;

  return (
    <Panel
      className={`attention-panel attention-panel--${variant}`}
      title={title}
      action={alerts ? <span className="badge-count" aria-label={`${alerts} сигнала`}>{alerts}</span> : null}
    >
      <div className="insights-list">
        {insights.map((insight) => {
          const Icon = iconByType[insight.type];
          return (
            <button
              type="button"
              className={`insight insight--${insight.type}`}
              key={insight.title}
              onClick={() => onOpenTab(insight.tab)}
            >
              <span className="insight__icon" aria-hidden="true">
                <Icon size={17} strokeWidth={2.2} />
              </span>
              <span className="insight__text">
                <strong>{insight.title}</strong>
                <small>{insight.text}</small>
              </span>
              <ChevronRight className="insight__arrow" size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
