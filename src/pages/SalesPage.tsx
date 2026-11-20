import { useMemo, useState } from "react";
import { ColumnHeader, FiltersBadge, useColumnFilters, useSort } from "../components/TableTools";
import { ProfitWaterfall, SalesTrendChart } from "../components/Charts";
import { Panel } from "../components/Panel";
import { RankList } from "../components/RankList";
import { formatDate, formatMoney, formatMoneyShort, formatNumber, formatPercent, plural } from "../lib/formatters";
import type { DemoData, SaleRecord } from "../lib/types";
import { buildView, dealersOf, shortDealer, type PeriodId } from "../lib/view";

type SalesPageProps = {
  data: DemoData;
  period: PeriodId;
};

export function SalesPage({ data, period }: SalesPageProps) {
  const [dealer, setDealer] = useState("all");
  const dealers = useMemo(() => dealersOf(data), [data]);
  const view = useMemo(() => buildView(data, period, dealer), [data, period, dealer]);
  const { metrics, economics, stock } = view;

  return (
    <div className="stack">
      <div className="chips" role="group" aria-label="Дилерский центр">
        {["all", ...dealers].map((item) => (
          <button
            key={item}
            type="button"
            className={`chip ${dealer === item ? "is-active" : ""}`}
            aria-pressed={dealer === item}
            onClick={() => setDealer(item)}
          >
            {item === "all" ? "Все дилерские центры" : item.replace(/^ДЦ\s*/, "")}
          </button>
        ))}
      </div>

      <section className="stat-strip">
        <div className="stat">
          <span>Продано</span>
          <strong>{formatNumber(metrics.salesCount)}</strong>
          <small>{plural(metrics.newCount, "новый", "новых", "новых")} · {formatNumber(metrics.usedCount)} с пробегом</small>
        </div>
        <div className="stat">
          <span>Выручка без НДС</span>
          <strong>{formatMoneyShort(metrics.salesAmount)}</strong>
          <small>средний чек {formatMoneyShort(metrics.averagePrice)}</small>
        </div>
        <div className="stat">
          <span>Валовая прибыль</span>
          <strong className={metrics.margin < 0 ? "text-danger" : ""}>{formatMoneyShort(metrics.margin)}</strong>
          <small>{formatPercent(metrics.marginPercent, 1)} от выручки · на машине {formatMoneyShort(metrics.carMargin)}</small>
        </div>
        <div className="stat">
          <span>Продажи в минус</span>
          <strong className={metrics.negativeMarginCount ? "text-danger" : ""}>{formatNumber(metrics.negativeMarginCount)}</strong>
          <small>убыточны с учётом допов и бонуса · по машине: {formatNumber(metrics.carMarginNegativeCount)}</small>
        </div>
      </section>

      <div className="grid grid--2-1">
        <Panel className="panel--chart" title="Продажи по неделям" subtitle="Столбцы — за неделю, линия — нарастающий итог">
          <SalesTrendChart weeks={view.weeks} height={268} />
        </Panel>
        <Panel title={dealer === "all" ? "Продажи по дилерским центрам" : "Выручка по моделям"}>
          {dealer === "all" ? (
            <RankList items={view.salesByDealer} limit={8} showShare />
          ) : (
            <RankList items={[...view.salesByModel].sort((a, b) => b.amount - a.amount)} limit={8} value="amount" color="green" />
          )}
        </Panel>
      </div>

      <div className="grid grid--2-1">
        <Panel title="Экономика сделки" subtitle="Из чего складывается валовая прибыль">
          <ProfitWaterfall steps={economics.steps} />
          <p className="panel-note">
            {economics.multiplier ? <>Допы, страховка и бонус увеличивают прибыль с машины в <b>{economics.multiplier.toFixed(1).replace(".", ",")} раза</b>. </> : <>Машины в среднем продаются в минус — прибыль дают допы, страховка и бонус. </>}
            Скидки съели {formatMoneyShort(economics.discount)} ({formatPercent(economics.discountShare, 1)} от РРЦ).
          </p>
        </Panel>
        <Panel title="Что продают вместе с машиной" subtitle="Доля сделок">
          <ul className="attach">
            <AttachRow label="Допоборудование" value={economics.accessoriesAttach} />
            <AttachRow label="Страховка" value={economics.insuranceAttach} />
            <AttachRow label="Трейд-ин" value={economics.tradeInShare} />
          </ul>
          <dl className="facts">
            <div><dt>Компенсация импортёра</dt><dd>{formatMoneyShort(economics.importerCompensation)}</dd></div>
            <div><dt>Средняя прибыль со сделки</dt><dd>{formatMoneyShort(metrics.salesCount ? metrics.margin / metrics.salesCount : 0)}</dd></div>
          </dl>
        </Panel>
      </div>

      <div className="grid grid--2-1">
        <Panel title="Склад: сколько стояла машина до продажи" subtitle={`Новые автомобили · в среднем ${formatNumber(Math.round(stock.averageDays))} дн.`}>
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Срок на складе</th>
                <th className="num">Продано</th>
                <th className="num">Прибыль на машину</th>
                <th className="num">% от выручки</th>
              </tr>
            </thead>
            <tbody>
              {stock.buckets.map((bucket) => (
                <tr key={bucket.name}>
                  <td>{bucket.name}</td>
                  <td className="num">{formatNumber(bucket.count)}</td>
                  <td className={`num nowrap ${bucket.profitPerCar < 0 ? "text-danger" : ""}`}>{bucket.count ? formatMoneyShort(bucket.profitPerCar) : "—"}</td>
                  <td className={`num ${bucket.profitPercent < 0 ? "text-danger" : ""}`}>{bucket.count ? formatPercent(bucket.profitPercent, 1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="panel-note">Чем дольше машина стоит, тем больше скидка и дороже её содержание. Срок — из колонки «Дней на складе» выгрузки продаж.</p>
        </Panel>
        <Panel title="Долго стояли" subtitle={`${plural(stock.over90, "машина", "машины", "машин")} больше 90 дней · ${formatNumber(stock.over180)} больше 180. Справа — прибыль сделки`}>
          <ol className="aged">
            {stock.aged.slice(0, 7).map((sale) => (
              <li key={sale.id}>
                <span className="aged__model">{sale.model}<small>{shortDealer(sale.dealer)}</small></span>
                <span className="aged__days">{formatNumber(sale.stockDays)} дн.</span>
                <b className={sale.margin < 0 ? "text-danger" : ""}>{formatMoneyShort(sale.margin)}</b>
              </li>
            ))}
            {!stock.aged.length ? <li className="aged__empty">Таких продаж нет</li> : null}
          </ol>
        </Panel>
      </div>

      <div className="grid grid--2">
        <Panel title="Продажи по менеджерам">
          <RankList items={view.salesByManager} limit={10} color="green" />
        </Panel>
        <Panel title="Топ моделей по продажам">
          <RankList items={view.salesByModel} limit={10} showShare />
        </Panel>
      </div>

      <SalesTable sales={view.latestSales} />
    </div>
  );
}

function AttachRow({ label, value }: { label: string; value: number }) {
  return (
    <li>
      <span>{label}</span>
      <span className="attach__bar"><i style={{ width: `${Math.min(100, value)}%` }} /></span>
      <b>{formatPercent(value, 0)}</b>
    </li>
  );
}

type SalesSortKey = "date" | "model" | "dealer" | "manager" | "price" | "profit" | "stock";
type SalesFilterKey = "model" | "dealer" | "manager" | "kind" | "result" | "stock";

const salesGetters: Record<SalesSortKey, (sale: SaleRecord) => string | number> = {
  date: (sale) => sale.saleDate,
  model: (sale) => sale.model,
  dealer: (sale) => sale.dealer,
  manager: (sale) => sale.manager,
  price: (sale) => sale.salePrice,
  profit: (sale) => sale.margin,
  stock: (sale) => sale.stockDays,
};

const stockBucket = (days: number) => (days <= 30 ? "до 30 дней" : days <= 90 ? "31–90 дней" : days <= 180 ? "91–180 дней" : "больше 180 дней");

const salesFilters: Record<SalesFilterKey, (sale: SaleRecord) => string> = {
  model: (sale) => sale.model,
  dealer: (sale) => shortDealer(sale.dealer),
  manager: (sale) => sale.manager,
  kind: (sale) => (sale.isUsed ? "С пробегом" : "Новый"),
  result: (sale) => (sale.margin < 0 ? "В минус" : "В плюс"),
  stock: (sale) => stockBucket(sale.stockDays),
};

function SalesTable({ sales }: { sales: SaleRecord[] }) {
  const { filtered, filters, options, setFilter, activeCount, clear } = useColumnFilters(sales, salesFilters);
  const { sorted, sort, setSort } = useSort(filtered, salesGetters, { key: "date", dir: "desc" });
  const totalPrice = filtered.reduce((total, sale) => total + sale.salePrice, 0);
  const totalProfit = filtered.reduce((total, sale) => total + sale.margin, 0);
  const col = (key: SalesFilterKey) => ({ options: options[key], selected: filters[key], onFilter: (values: string[] | null) => setFilter(key, values) });

  return (
    <Panel
      title="Продажи за период"
      subtitle="Нажмите на заголовок столбца — сортировка и выбор значений"
      action={<FiltersBadge count={activeCount} onClear={clear} />}
    >
      <div className="table-wrap table-wrap--scroll">
        <table className="table">
          <thead>
            <tr>
              <ColumnHeader label="Дата" sortKey="date" sort={sort} onSort={setSort} sortLabels={{ asc: "Сначала старые", desc: "Сначала новые" }} />
              <ColumnHeader label="Автомобиль" sortKey="model" sort={sort} onSort={setSort} {...col("model")} />
              <ColumnHeader label="Тип" {...col("kind")} />
              <th>VIN</th>
              <ColumnHeader label="ДЦ" sortKey="dealer" sort={sort} onSort={setSort} {...col("dealer")} />
              <ColumnHeader label="Менеджер" sortKey="manager" sort={sort} onSort={setSort} {...col("manager")} />
              <ColumnHeader label="Склад" sortKey="stock" sort={sort} onSort={setSort} numeric {...col("stock")} />
              <ColumnHeader label="Цена без НДС" sortKey="price" sort={sort} onSort={setSort} numeric />
              <ColumnHeader label="Прибыль" sortKey="profit" sort={sort} onSort={setSort} numeric {...col("result")} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((sale) => (
              <tr key={sale.id}>
                <td className="nowrap">{formatDate(sale.saleDate)}</td>
                <td className="nowrap"><span className="cell-main">{sale.model}</span></td>
                <td className="nowrap">{sale.isUsed ? <span className="tag tag--muted">с пробегом</span> : <span className="muted">новый</span>}</td>
                <td className="nowrap mono">{sale.vinMasked || "—"}</td>
                <td className="nowrap">{shortDealer(sale.dealer)}</td>
                <td className="nowrap">{sale.manager}</td>
                <td className={`num nowrap ${sale.stockDays > 90 ? "text-warning" : ""}`}>{formatNumber(sale.stockDays)} дн.</td>
                <td className="num nowrap">{formatMoney(sale.salePrice)}</td>
                <td className={`num nowrap ${sale.margin < 0 ? "text-danger" : ""}`}>
                  {formatMoneyShort(sale.margin)}
                  <small className="cell-sub">{formatPercent(sale.marginPercent, 1)}</small>
                </td>
              </tr>
            ))}
            {!sorted.length ? (
              <tr>
                <td colSpan={9} className="empty-state">Нет сделок с такими фильтрами</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}>Итого: {plural(filtered.length, "сделка", "сделки", "сделок")}</td>
              <td className="num nowrap">{formatMoney(totalPrice)}</td>
              <td className={`num nowrap ${totalProfit < 0 ? "text-danger" : ""}`}>
                {formatMoneyShort(totalProfit)}
                <small className="cell-sub">{formatPercent(totalPrice ? (totalProfit / totalPrice) * 100 : 0, 1)}</small>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}
