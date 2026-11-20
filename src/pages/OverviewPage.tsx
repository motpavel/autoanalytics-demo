import { CarFront, Coins, ShieldCheck, Timer, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { AttentionPanel } from "../components/AttentionPanel";
import { Donut, SalesTrendChart, ServiceTrendChart } from "../components/Charts";
import { KpiCard } from "../components/KpiCard";
import { Panel } from "../components/Panel";
import { RankList } from "../components/RankList";
import { formatDate, formatDuration, formatMoneyShort, formatNumber, formatPercent, moneyParts, plural, repairTagClass } from "../lib/formatters";
import type { DemoData, TabId } from "../lib/types";
import type { DashboardView } from "../lib/view";

type OverviewPageProps = {
  data: DemoData;
  view: DashboardView;
  onOpenTab: (tab: TabId) => void;
};

function MoreLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="panel-link" type="button" onClick={onClick}>
      {label} →
    </button>
  );
}

export function OverviewPage({ data, view, onOpenTab }: OverviewPageProps) {
  const { metrics, deltas } = view;
  const amount = moneyParts(metrics.salesAmount);
  const profit = moneyParts(metrics.margin);
  const agedNegative = view.latestSales.filter((sale) => sale.margin < 0 && sale.stockDays > 180).length;
  const service = moneyParts(metrics.commercialAmount);
  const deltaLabel = view.period === "all" ? "июнь к маю" : "к маю";

  return (
    <div className="overview-v2">
      <section className="domain domain--sales" aria-labelledby="domain-sales">
        <DomainHead
          id="domain-sales"
          icon={<CarFront size={18} />}
          title="Продажи"
          subtitle="Автомобили: новые и с пробегом, все дилерские центры"
          onOpen={() => onOpenTab("sales")}
        />
        <div className="kpi-grid kpi-grid--4">
          <KpiCard
            title="Продано автомобилей"
            value={metrics.salesCount}
            delta={deltas.salesCount}
            deltaLabel={deltaLabel}
            note={`${plural(metrics.newCount, "новый", "новых", "новых")} · ${formatNumber(metrics.usedCount)} с пробегом`}
            icon={<CarFront size={20} />}
            spark={view.weeks.map((week) => week.count)}
          />
          <KpiCard
            title="Сумма продаж"
            value={metrics.salesAmount}
            format={(n) => formatNumber(n / amount.divisor, 1)}
            unit={amount.unit}
            delta={deltas.salesAmount}
            deltaLabel={deltaLabel}
            note={`средний чек ${formatMoneyShort(metrics.averagePrice)}`}
            tone="green"
            icon={<Coins size={20} />}
          />
          <KpiCard
            title="Валовая прибыль"
            value={metrics.margin}
            format={(n) => formatNumber(n / profit.divisor, 1)}
            unit={profit.unit}
            note={<><b>{formatPercent(metrics.marginPercent, 1)}</b> от выручки · с допами и бонусом</>}
            tone="green"
            icon={<TrendingUp size={20} />}
          />
          <KpiCard
            title="Продажи в минус"
            value={metrics.negativeMarginCount}
            note={<><b>{formatNumber(agedNegative)}</b> из них — машины со склада 180+ дней</>}
            tone="orange"
            icon={<TrendingDown size={20} />}
          />
        </div>
        <AttentionPanel
          variant="strip"
          title="Требует внимания в продажах"
          insights={view.insights.filter((insight) => insight.tab === "sales")}
          onOpenTab={onOpenTab}
        />
        <div className="domain__row domain__row--chart">
          <Panel className="panel--chart" title="Продажи по неделям" subtitle="Столбцы — за неделю, линия — нарастающий итог">
            <SalesTrendChart weeks={view.weeks} />
          </Panel>
          <Panel title="Дилерские центры" subtitle="Продажи, шт.">
            <RankList items={view.salesByDealer} />
            <MoreLink label="Все продажи" onClick={() => onOpenTab("sales")} />
          </Panel>
        </div>
        <div className="domain__row">
          <Panel title="Топ моделей" subtitle="Продажи, шт. и доля">
            <RankList items={view.salesByModel} showShare limit={6} />
          </Panel>
          <Panel title="Последние продажи">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Автомобиль</th>
                    <th className="num">Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {view.latestSales.slice(0, 5).map((sale) => (
                    <tr key={sale.id}>
                      <td className="nowrap">{formatDate(sale.saleDate)}</td>
                      <td>
                        <span className="cell-main">{sale.model}</span>
                        <span className="cell-sub">{sale.manager}</span>
                      </td>
                      <td className="num nowrap">{formatMoneyShort(sale.salePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MoreLink label="Перейти к продажам" onClick={() => onOpenTab("sales")} />
          </Panel>
        </div>
      </section>

      <section className="domain domain--service" aria-labelledby="domain-service">
        <DomainHead
          id="domain-service"
          icon={<Wrench size={18} />}
          title="Сервис"
          subtitle="Заказ-наряды: клиентские, гарантийные и внутренние"
          onOpen={() => onOpenTab("service")}
        />
        <div className="kpi-grid kpi-grid--4">
          <KpiCard
            title="Заказ-наряды"
            value={metrics.ordersCount}
            delta={deltas.orders}
            deltaLabel={deltaLabel}
            note={`ср. срок ремонта ${formatDuration(metrics.averageRepairDays)}`}
            tone="cyan"
            icon={<Wrench size={20} />}
          />
          <KpiCard
            title="Выручка с клиентов"
            value={metrics.commercialAmount}
            format={(n) => formatNumber(n / service.divisor, 1)}
            unit={service.unit}
            note={`${plural(metrics.commercialCount, "клиентский наряд", "клиентских наряда", "клиентских нарядов")}`}
            tone="cyan"
            icon={<Coins size={20} />}
          />
          <KpiCard
            title="Гарантийные обращения"
            value={metrics.warrantyCount}
            note={<><b>{formatPercent(metrics.warrantyShare, 0)}</b> от всех нарядов</>}
            tone="purple"
            icon={<ShieldCheck size={20} />}
          />
          <KpiCard
            title="Закрыто позже плана"
            value={metrics.lateCount}
            note={<><b>{formatPercent(metrics.lateShare, 1)}</b> нарядов с датами</>}
            tone="orange"
            icon={<Timer size={20} />}
          />
        </div>
        <AttentionPanel
          variant="strip"
          title="Требует внимания в сервисе"
          insights={view.insights.filter((insight) => insight.tab !== "sales")}
          onOpenTab={onOpenTab}
        />
        <div className="domain__row domain__row--chart">
          <Panel className="panel--chart" title="Заказ-наряды по неделям" subtitle="По дате закрытия, по типам">
            <ServiceTrendChart weeks={view.weeks} />
          </Panel>
          <Panel title="Типы заказ-нарядов" subtitle={`${formatNumber(metrics.ordersCount)} заказ-нарядов`}>
            <Donut
              centerValue={formatPercent(metrics.commercialShare, 0)}
              centerLabel="клиентские"
              items={[
                { name: "Клиентские", value: metrics.commercialCount, color: "#3fb3bf" },
                { name: "Гарантийные", value: metrics.warrantyCount, color: "#7a62d6" },
                { name: "Внутренние", value: metrics.internalCount, color: "#c3cad6" },
              ]}
            />
          </Panel>
        </div>
        <div className="domain__row">
          <Panel title="Заезды в сервис по моделям" subtitle="Шт. и доля">
            <RankList items={view.serviceByModel} color="purple" showShare limit={6} />
          </Panel>
          <Panel title="Последние заказ-наряды">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Модель</th>
                    <th>Тип</th>
                    <th className="num">Срок</th>
                  </tr>
                </thead>
                <tbody>
                  {view.latestOrders.slice(0, 5).map((order) => (
                    <tr key={order.id}>
                      <td className="nowrap">{formatDate(order.closeDate)}</td>
                      <td>
                        <span className="cell-main">{order.model}</span>
                        <span className="cell-sub">VIN {order.vinMasked || "—"}</span>
                      </td>
                      <td>
                        <span className={repairTagClass(order.repairCategory)}>{order.repairCategory}</span>
                      </td>
                      <td className={`num nowrap ${order.isLate ? "text-danger" : ""}`}>
                        {order.isLate ? "позже плана" : formatDuration(order.durationDays)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MoreLink label="Перейти к сервису" onClick={() => onOpenTab("service")} />
          </Panel>
        </div>
      </section>

    </div>
  );
}

function DomainHead({ id, icon, title, subtitle, onOpen }: { id: string; icon: ReactNode; title: string; subtitle: string; onOpen: () => void }) {
  return (
    <header className="domain__head">
      <span className="domain__icon" aria-hidden="true">{icon}</span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <button type="button" className="domain__open" onClick={onOpen}>
        Открыть раздел →
      </button>
    </header>
  );
}
