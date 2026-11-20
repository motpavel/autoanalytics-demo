import { useEffect, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoneyShort, formatNumber, formatPercent } from "../lib/formatters";
import type { WeekPoint } from "../lib/view";
import { Segmented } from "./Segmented";

const AXIS = { fontSize: 12, fill: "#8a94a6" };
const GRID = "rgba(15, 23, 42, 0.06)";

type TooltipRow = { name?: string; value?: number | string; color?: string; dataKey?: string | number; payload?: WeekPoint };

function ChartTooltip({ active, payload, money }: { active?: boolean; payload?: TooltipRow[]; money?: boolean }) {
  if (!active || !payload?.length) return null;
  const week = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <b>Неделя {week?.range}</b>
      {payload.map((row) => (
        <span key={String(row.dataKey)}>
          <i style={{ background: row.color }} />
          {row.name}
          <strong>{money ? formatMoneyShort(Number(row.value)) : formatNumber(Number(row.value))}</strong>
        </span>
      ))}
    </div>
  );
}

/** Продажи по неделям + нарастающий итог, переключатель штуки / рубли. */
export function SalesTrendChart({ weeks, height = 236 }: { weeks: WeekPoint[]; height?: number }) {
  const [mode, setMode] = useState<"count" | "amount">("count");
  const money = mode === "amount";
  const barKey = money ? "amount" : "count";
  const lineKey = money ? "cumulativeAmount" : "cumulative";
  const tick = (value: number) => (money ? formatNumber(value / 1_000_000, 0) : formatNumber(value));

  return (
    <div className="trend">
      <div className="trend__bar">
        <div className="chart-legend">
          <span><i className="legend-dot legend-dot--bar" />За неделю</span>
          <span><i className="legend-dot legend-dot--line" />Нарастающий итог</span>
          {money ? <span className="chart-legend__unit">млн ₽</span> : null}
        </div>
        <Segmented
          size="sm"
          label="Единицы"
          value={mode}
          onChange={setMode}
          options={[
            { id: "count", label: "Шт." },
            { id: "amount", label: "₽" },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={weeks} margin={{ top: 14, right: 4, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="gBar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a9cbfb" />
              <stop offset="100%" stopColor="#d3e4fc" />
            </linearGradient>
            <linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1677ff" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#1677ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval="preserveStartEnd" minTickGap={8} dy={6} />
          <YAxis yAxisId="bars" tickLine={false} axisLine={false} tick={AXIS} width={44} tickFormatter={tick} allowDecimals={false} />
          <YAxis yAxisId="line" orientation="right" tickLine={false} axisLine={false} tick={AXIS} width={44} tickFormatter={tick} allowDecimals={false} />
          <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: "rgba(22,119,255,0.05)", radius: 8 }} />
          <Area yAxisId="line" type="monotone" dataKey={lineKey} fill="url(#gArea)" stroke="none" legendType="none" tooltipType="none" animationDuration={700} />
          <Bar yAxisId="bars" dataKey={barKey} name="За неделю" fill="url(#gBar)" radius={[8, 8, 3, 3]} maxBarSize={40} animationDuration={700} />
          <Line
            yAxisId="line"
            type="monotone"
            dataKey={lineKey}
            name="Нарастающий итог"
            stroke="#1f5fd6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, fill: "#1677ff", stroke: "#fff", strokeWidth: 3 }}
            animationDuration={900}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Заказ-наряды по неделям: гарантия и платные. */
export function ServiceTrendChart({ weeks, height = 256 }: { weeks: WeekPoint[]; height?: number }) {
  return (
    <div className="trend">
      <div className="trend__bar">
        <div className="chart-legend">
          <span><i className="legend-dot" style={{ background: "#5fc4cf" }} />Клиентские</span>
          <span><i className="legend-dot" style={{ background: "#7a62d6" }} />Гарантийные</span>
          <span><i className="legend-dot" style={{ background: "#c3cad6" }} />Внутренние</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={weeks} margin={{ top: 14, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="gPaid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5fc4cf" />
              <stop offset="100%" stopColor="#8fd6dd" />
            </linearGradient>
            <linearGradient id="gWarranty" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7a62d6" />
              <stop offset="100%" stopColor="#9d8ae3" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval="preserveStartEnd" minTickGap={8} dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={40} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(124,77,255,0.05)", radius: 8 }} />
          <Bar dataKey="commercial" stackId="s" name="Клиентские" fill="url(#gPaid)" radius={[0, 0, 3, 3]} maxBarSize={40} animationDuration={700} />
          <Bar dataKey="internal" stackId="s" name="Внутренние" fill="#c3cad6" maxBarSize={40} animationDuration={700} />
          <Bar dataKey="warranty" stackId="s" name="Гарантийные" fill="url(#gWarranty)" radius={[8, 8, 0, 0]} maxBarSize={40} animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type DonutProps = {
  items: Array<{ name: string; value: number; color: string; colorTo?: string }>;
  centerLabel: string;
  centerValue: string;
  size?: number;
};

/** SVG-пончик со скруглёнными сегментами и прорисовкой при появлении. */
export function Donut({ items, centerLabel, centerValue, size = 164 }: DonutProps) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const stroke = 16;
  const radius = 50 - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const gap = items.length > 1 ? 3.5 : 0;
  let offset = 0;

  return (
    <div className="donut">
      <div className="donut__ring" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            {items.map((item, index) => (
              <linearGradient key={item.name} id={`donut-${index}-${item.color.slice(1)}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={item.colorTo || item.color} />
                <stop offset="100%" stopColor={item.color} />
              </linearGradient>
            ))}
          </defs>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth={stroke} />
          {items.map((item, index) => {
            const length = (item.value / total) * circumference;
            const visible = Math.max(0, length - gap);
            const dash = drawn ? `${visible} ${circumference}` : `0 ${circumference}`;
            const segment = (
              <circle
                key={item.name}
                className="donut__segment"
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={`url(#donut-${index}-${item.color.slice(1)})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={dash}
                strokeDashoffset={-offset - gap / 2}
                transform="rotate(-90 50 50)"
                style={{ transitionDelay: `${index * 120}ms` }}
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="donut__center">
          <strong>{centerValue}</strong>
          <small>{centerLabel}</small>
        </div>
      </div>
      <ul className="donut__legend">
        {items.map((item) => (
          <li key={item.name}>
            <span><i style={{ background: `linear-gradient(135deg, ${item.colorTo || item.color}, ${item.color})` }} />{item.name}</span>
            <b>
              {formatNumber(item.value)} <small>{formatPercent((item.value / total) * 100, 0)}</small>
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

type WaterfallStep = { name: string; value: number; kind: "start" | "step" | "total" };

/** Каскад прибыли: из чего складывается итог. Горизонтальные полосы, читаются на любом экране. */
export function ProfitWaterfall({ steps }: { steps: WaterfallStep[] }) {
  let running = 0;
  const rows = steps.map((step) => {
    let from: number;
    let to: number;
    if (step.kind === "step") {
      from = running;
      to = running + step.value;
      running = to;
    } else {
      from = 0;
      to = step.value;
      running = step.value;
    }
    return { ...step, from: Math.min(from, to), to: Math.max(from, to) };
  });
  const min = Math.min(0, ...rows.map((row) => row.from));
  const max = Math.max(1, ...rows.map((row) => row.to));
  const span = max - min || 1;
  const pct = (value: number) => ((value - min) / span) * 100;

  return (
    <ol className="waterfall">
      {rows.map((row) => (
        <li key={row.name} className={`waterfall__row waterfall__row--${row.kind} ${row.value < 0 ? "is-negative" : ""}`}>
          <span className="waterfall__name">{row.name}</span>
          <span className="waterfall__track">
            {min < 0 ? <i className="waterfall__zero" style={{ left: `${pct(0)}%` }} aria-hidden="true" /> : null}
            <span className="waterfall__bar" style={{ left: `${pct(row.from)}%`, width: `${Math.max(0.6, pct(row.to) - pct(row.from))}%` }} />
          </span>
          <b className="waterfall__value">
            {row.kind === "step" && row.value > 0 ? "+" : ""}
            {formatMoneyShort(row.value)}
          </b>
        </li>
      ))}
    </ol>
  );
}

type HeatmapProps = {
  rows: string[];
  columns: number[];
  grid: number[][];
  max: number;
};

/** Тепловая карта загрузки: день недели × час. */
export function LoadHeatmap({ rows, columns, grid, max }: HeatmapProps) {
  return (
    <div className="heatmap-wrap">
    <div className="heatmap" style={{ gridTemplateColumns: `34px repeat(${columns.length}, minmax(0, 1fr))` }}>
      <span />
      {columns.map((hour) => (
        <span key={hour} className="heatmap__col">{hour}:00</span>
      ))}
      {rows.map((day, rowIndex) => (
        <div className="heatmap__row" key={day} style={{ display: "contents" }}>
          <span className="heatmap__day">{day}</span>
          {grid[rowIndex].map((value, colIndex) => {
            const intensity = value / max;
            return (
              <span
                key={colIndex}
                className="heatmap__cell"
                title={`${day}, ${columns[colIndex]}:00 — ${formatNumber(value)} заказ-нарядов`}
                style={{ background: value ? `rgba(31, 95, 214, ${0.08 + intensity * 0.82})` : "rgba(15, 23, 42, 0.035)", color: intensity > 0.55 ? "#fff" : "#344054" }}
              >
                {value || ""}
              </span>
            );
          })}
        </div>
      ))}
    </div>
    <div className="heatmap__legend">
      <span>Меньше заказ-нарядов</span>
      <i />
      <span>Больше</span>
    </div>
    </div>
  );
}
