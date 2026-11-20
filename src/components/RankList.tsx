import type { NamedMetric } from "../lib/types";
import { formatMoneyShort, formatNumber, formatPercent } from "../lib/formatters";

type RankListProps = {
  items: NamedMetric[];
  limit?: number;
  color?: "blue" | "purple" | "green" | "orange" | "red";
  value?: "count" | "amount";
  showShare?: boolean;
  emptyText?: string;
};

export function RankList({
  items,
  limit = 5,
  color = "blue",
  value = "count",
  showShare = false,
  emptyText = "Нет данных за период",
}: RankListProps) {
  const scoped = items.slice(0, limit);
  const max = Math.max(...scoped.map((item) => (value === "amount" ? item.amount : item.count)), 1);

  if (!scoped.length) return <p className="empty-state">{emptyText}</p>;

  return (
    <ol className={`rank-list ${showShare ? "rank-list--share" : ""}`}>
      {scoped.map((item) => {
        const rawValue = value === "amount" ? item.amount : item.count;
        return (
          <li className={`rank rank--${color}`} key={item.name}>
            <span className="rank__name" title={item.name}>{item.name}</span>
            <span className="rank__track" aria-hidden="true">
              <span className="rank__fill" style={{ width: `${Math.max(4, (rawValue / max) * 100)}%` }} />
            </span>
            <b className="rank__value">{value === "amount" ? formatMoneyShort(item.amount) : formatNumber(item.count)}</b>
            {showShare ? <small className="rank__share">{formatPercent(item.share, 0)}</small> : null}
          </li>
        );
      })}
    </ol>
  );
}
