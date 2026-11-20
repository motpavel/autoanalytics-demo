import { useId, type ReactNode } from "react";
import { useCountUp } from "../hooks/useCountUp";
import { formatNumber, formatSignedPercent } from "../lib/formatters";

type KpiCardProps = {
  title: string;
  value: number;
  /** Как показывать число во время и после анимации. */
  format?: (value: number) => string;
  unit?: string;
  /** Изменение в процентах; null — сравнения нет. */
  delta?: number | null;
  deltaLabel?: string;
  /** Подпись вместо изменения, например «13% от всех». */
  note?: ReactNode;
  tone?: "blue" | "green" | "purple" | "orange" | "cyan";
  icon: ReactNode;
  spark?: number[];
};

function Sparkline({ values }: { values: number[] }) {
  const id = useId();
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const width = 96;
  const height = 34;
  const step = width / (values.length - 1);
  const pts = values.map((value, index) => [index * step, height - 4 - (value / max) * (height - 10)]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const [lastX, lastY] = pts[pts.length - 1];
  return (
    <svg className="kpi__spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill="currentColor" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

export function KpiCard({
  title,
  value,
  format = (n) => formatNumber(Math.round(n)),
  unit,
  delta,
  deltaLabel = "к маю",
  note,
  tone = "blue",
  icon,
  spark,
}: KpiCardProps) {
  const animated = useCountUp(value);
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const direction = hasDelta ? (delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat") : "flat";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";

  return (
    <article className={`kpi kpi--${tone}`}>
      <div className="kpi__head">
        <span className="kpi__label">{title}</span>
        <span className="kpi__icon" aria-hidden="true">{icon}</span>
      </div>
      <div className="kpi__value" aria-label={`${format(value)}${unit ? ` ${unit}` : ""}`}>
        <span aria-hidden="true">{format(animated)}</span>
        {unit ? <span className="kpi__unit" aria-hidden="true">{unit}</span> : null}
      </div>
      <div className="kpi__footer">
        {hasDelta ? (
          <span className={`kpi__delta kpi__delta--${direction}`}>
            <span className="kpi__delta-pill">
              {arrow} {formatSignedPercent(delta)}
            </span>
            <small>{deltaLabel}</small>
          </span>
        ) : (
          <span className="kpi__note">{note}</span>
        )}
        {spark ? <Sparkline values={spark} /> : null}
      </div>
    </article>
  );
}
