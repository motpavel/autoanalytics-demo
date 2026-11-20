import { Donut, LoadHeatmap, ServiceTrendChart } from "../components/Charts";
import { Panel } from "../components/Panel";
import { RankList } from "../components/RankList";
import { ColumnHeader, FiltersBadge, useColumnFilters, useSort } from "../components/TableTools";
import { formatDate, formatDuration, formatMoney, formatMoneyShort, formatNumber, formatPercent, plural, repairTagClass } from "../lib/formatters";
import type { ServiceOrder } from "../lib/types";
import type { DashboardView } from "../lib/view";

type ServicePageProps = {
  view: DashboardView;
};

export const KIND_COLORS = { client: "#3fb3bf", warranty: "#7a62d6", internal: "#c3cad6" };

export function ServicePage({ view }: ServicePageProps) {
  const { metrics, load, repeats } = view;
  const maxRepeat = Math.max(1, ...repeats.distribution.map((item) => item.count));

  return (
    <div className="stack">
      <section className="stat-strip">
        <div className="stat">
          <span>Заказ-наряды</span>
          <strong>{formatNumber(metrics.ordersCount)}</strong>
          <small>{formatNumber(metrics.commercialCount)} клиентских · {formatNumber(metrics.warrantyCount)} гарантия · {formatNumber(metrics.internalCount)} внутр.</small>
        </div>
        <div className="stat">
          <span>Выручка с клиентов</span>
          <strong>{formatMoneyShort(metrics.commercialAmount)}</strong>
          <small>работы и запчасти, без гарантии и ПСО</small>
        </div>
        <div className="stat">
          <span>Закрыто позже плана</span>
          <strong className={metrics.lateCount ? "text-danger" : ""}>{formatNumber(metrics.lateCount)}</strong>
          <small>{formatPercent(metrics.lateShare, 1)} нарядов с датами</small>
        </div>
        <div className="stat">
          <span>Средний срок ремонта</span>
          <strong>{formatDuration(metrics.averageRepairDays)}</strong>
          <small>гарантия: {formatDuration(metrics.averageWarrantyRepairDays)}</small>
        </div>
      </section>

      <Panel title="Нагрузка по месяцам" subtitle="Сколько заказ-нарядов закрыто и сколько они принесли">
        <div className="month-cards">
          {view.serviceMonths.map((month) => (
            <article className="month-card" key={month.month}>
              <header>
                <strong>{month.label}</strong>
                <span>{formatNumber(month.count)} заказ-нарядов</span>
              </header>
              <div className="split-bar" aria-hidden="true">
                <i style={{ flex: month.client, background: KIND_COLORS.client }} />
                <i style={{ flex: month.warranty, background: KIND_COLORS.warranty }} />
                <i style={{ flex: month.internal, background: KIND_COLORS.internal }} />
              </div>
              <KindLegend client={month.client} warranty={month.warranty} internal={month.internal} />
              <dl className="facts facts--flush">
                <div><dt>Выручка с клиентов</dt><dd>{formatMoneyShort(month.clientRevenue)}</dd></div>
                <div><dt>Нормо-часов</dt><dd>{formatNumber(Math.round(month.hours))}</dd></div>
                <div><dt>В среднем за рабочий день</dt><dd>{formatNumber(month.perDay, 1)} наряда</dd></div>
                <div><dt>Позже плана</dt><dd className={month.lateShare ? "text-danger" : ""}>{formatPercent(month.lateShare, 1)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid grid--2-1">
        <Panel className="panel--chart" title="Заказ-наряды по неделям" subtitle="По дате закрытия, по типам">
          <ServiceTrendChart weeks={view.weeks} />
        </Panel>
        <Panel title="Типы заказ-нарядов" subtitle="Внутренние — ПСО, доп. оборудование, содержание">
          <Donut
            size={176}
            centerValue={formatPercent(metrics.commercialShare, 0)}
            centerLabel="клиентские"
            items={[
              { name: "Клиентские", value: metrics.commercialCount, color: KIND_COLORS.client },
              { name: "Гарантийные", value: metrics.warrantyCount, color: KIND_COLORS.warranty },
              { name: "Внутренние", value: metrics.internalCount, color: KIND_COLORS.internal },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid--2-1">
        <Panel
          title="В какие дни и часы приезжают клиенты"
          subtitle={`Строки — дни недели, столбцы — час открытия заказ-наряда. Цифра — сколько нарядов открыто в это время. Пик: ${load.peakDay}, ${load.peakHour}:00`}
        >
          <LoadHeatmap rows={load.weekdays} columns={load.hours} grid={load.grid} max={load.max} />
        </Panel>

        <Panel title="Повторные визиты" subtitle="Сколько раз одна машина приезжала за период (без внутренних нарядов)">
          <div className="metric-big">
            <strong>{formatPercent(repeats.share, 0)}</strong>
            <span>
              {plural(repeats.repeated, "автомобиль", "автомобиля", "автомобилей")} из {formatNumber(repeats.vehicles)} приезжали больше одного раза
            </span>
          </div>
          <ul className="repeat-dist">
            {repeats.distribution.map((item, index) => (
              <li key={item.name}>
                <span>{item.name}</span>
                <span className="repeat-dist__bar">
                  <i style={{ width: `${(item.count / maxRepeat) * 100}%`, opacity: index === 0 ? 0.35 : 1 }} />
                </span>
                <b>{formatNumber(item.count)}</b>
              </li>
            ))}
          </ul>
          <dl className="facts">
            <div><dt>Гарантия среди повторных визитов</dt><dd>{formatPercent(repeats.repeatedWarrantyShare, 0)}</dd></div>
            <div><dt>Выручка с повторных клиентских визитов</dt><dd>{formatMoneyShort(repeats.repeatedRevenue)}</dd></div>
          </dl>
        </Panel>
      </div>

      {repeats.top.length ? (
        <Panel title="Чаще всего приезжали" subtitle="Повторный визит — повод проверить качество первого ремонта или предложить ТО-пакет">
          <div className="repeat-cards">
            {repeats.top.map((car) => (
              <article className="repeat-card" key={car.vin}>
                <span className="repeat-card__visits">
                  <b>{car.visits}</b>
                  {car.visits >= 5 ? "визитов" : "визита"}
                </span>
                <div>
                  <strong>{car.model}</strong>
                  <small className="mono">VIN {car.vinMasked}</small>
                  <div className="repeat-card__dots" aria-label={`${car.client} клиентских, ${car.warranty} гарантийных`}>
                    {Array.from({ length: car.client }, (_, index) => <i key={`c${index}`} style={{ background: KIND_COLORS.client }} />)}
                    {Array.from({ length: car.warranty }, (_, index) => <i key={`w${index}`} style={{ background: KIND_COLORS.warranty }} />)}
                  </div>
                  <small>{formatMoney(car.amount)} за период</small>
                </div>
              </article>
            ))}
          </div>
          <div className="panel-note">
            <KindLegend withInternal={false} />
          </div>
        </Panel>
      ) : null}

      <div className="grid grid--3">
        <Panel title="Топ моделей по заездам">
          <RankList items={view.serviceByModel} limit={8} color="purple" showShare />
        </Panel>
        <Panel title="Гарантийные обращения по моделям" subtitle="Частота в заказ-нарядах, не оценка надёжности">
          <RankList items={view.warrantyByModel} limit={8} color="orange" showShare />
        </Panel>
        <Panel title="Превышение плановой даты" subtitle="Заказ-наряды, закрытые позже плана">
          <RankList items={view.lateByModel} limit={8} color="red" emptyText="Превышений нет" />
        </Panel>
      </div>

      <OrdersTable orders={view.latestOrders} />
    </div>
  );
}

type KindLegendProps = { client?: number; warranty?: number; internal?: number; withInternal?: boolean };

/** Подпись цветов: что значит бирюзовый, фиолетовый и серый. */
export function KindLegend({ client, warranty, internal, withInternal = true }: KindLegendProps) {
  const count = (value?: number) => (typeof value === "number" ? ` · ${formatNumber(value)}` : "");
  return (
    <span className="kind-legend">
      <span><i style={{ background: KIND_COLORS.client }} />Клиентские (платит клиент){count(client)}</span>
      <span><i style={{ background: KIND_COLORS.warranty }} />Гарантийные (платит импортёр){count(warranty)}</span>
      {withInternal ? <span><i style={{ background: KIND_COLORS.internal }} />Внутренние (ПСО, допы){count(internal)}</span> : null}
    </span>
  );
}

type OrderSortKey = "date" | "model" | "type" | "master" | "amount" | "duration";
type OrderFilterKey = "model" | "type" | "repair" | "master" | "timing";

const orderGetters: Record<OrderSortKey, (order: ServiceOrder) => string | number> = {
  date: (order) => order.closeDate,
  model: (order) => order.model,
  type: (order) => order.repairCategory,
  master: (order) => order.master,
  amount: (order) => order.totalAmount,
  duration: (order) => (order.isLate ? 10_000 : order.durationDays ?? -1),
};

const orderFilters: Record<OrderFilterKey, (order: ServiceOrder) => string> = {
  model: (order) => order.model,
  type: (order) => order.repairCategory,
  repair: (order) => order.repairType,
  master: (order) => order.master,
  timing: (order) => (order.isLate ? "Позже плана" : order.hasRepairDates ? "В срок" : "Нет дат"),
};

function OrdersTable({ orders }: { orders: ServiceOrder[] }) {
  const { filtered, filters, options, setFilter, activeCount, clear } = useColumnFilters(orders, orderFilters);
  const { sorted, sort, setSort } = useSort(filtered, orderGetters, { key: "date", dir: "desc" });
  const total = filtered.reduce((sum, order) => sum + order.totalAmount, 0);
  const late = filtered.filter((order) => order.isLate).length;
  const col = (key: OrderFilterKey) => ({ options: options[key], selected: filters[key], onFilter: (values: string[] | null) => setFilter(key, values) });

  return (
    <Panel
      title="Заказ-наряды за период"
      subtitle="Нажмите на заголовок столбца — сортировка и выбор значений"
      action={<FiltersBadge count={activeCount} onClear={clear} />}
    >
      <div className="table-wrap table-wrap--scroll">
        <table className="table">
          <thead>
            <tr>
              <ColumnHeader label="Закрыт" sortKey="date" sort={sort} onSort={setSort} sortLabels={{ asc: "Сначала старые", desc: "Сначала новые" }} />
              <th>Номер</th>
              <ColumnHeader label="Модель" sortKey="model" sort={sort} onSort={setSort} {...col("model")} />
              <th>VIN</th>
              <ColumnHeader label="Тип" sortKey="type" sort={sort} onSort={setSort} {...col("type")} />
              <ColumnHeader label="Вид ремонта" {...col("repair")} />
              <ColumnHeader label="Мастер" sortKey="master" sort={sort} onSort={setSort} {...col("master")} />
              <ColumnHeader label="Сумма" sortKey="amount" sort={sort} onSort={setSort} numeric />
              <ColumnHeader label="Срок" sortKey="duration" sort={sort} onSort={setSort} numeric {...col("timing")} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((order) => (
              <tr key={order.id}>
                <td className="nowrap">{formatDate(order.closeDate)}</td>
                <td className="nowrap mono">{order.orderNumber}</td>
                <td className="nowrap">{order.model}</td>
                <td className="nowrap mono">{order.vinMasked || "—"}</td>
                <td><span className={repairTagClass(order.repairCategory)}>{order.repairCategory}</span></td>
                <td className="ellipsis" title={order.repairType}>{order.repairType}</td>
                <td className="nowrap">{order.master}</td>
                <td className="num nowrap">{formatMoney(order.totalAmount)}</td>
                <td className={`num nowrap ${order.isLate ? "text-danger" : ""}`}>
                  {order.isLate ? "позже плана" : formatDuration(order.durationDays)}
                </td>
              </tr>
            ))}
            {!sorted.length ? (
              <tr>
                <td colSpan={9} className="empty-state">Нет заказ-нарядов с такими фильтрами</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}>
                Итого: {plural(filtered.length, "заказ-наряд", "заказ-наряда", "заказ-нарядов")}
                {late ? <span className="text-danger"> · {formatNumber(late)} позже плана</span> : null}
              </td>
              <td className="num nowrap">{formatMoney(total)}</td>
              <td className="num nowrap">{filtered.length ? `ср. ${formatMoney(total / filtered.length)}` : "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}
