import { ChevronRight, Info } from "lucide-react";
import { Fragment, useState } from "react";
import { KindLegend, KIND_COLORS } from "./ServicePage";
import { formatDate, plural } from "../lib/formatters";
import { Panel } from "../components/Panel";
import { formatDuration, formatMoney, formatMoneyShort, formatNumber, formatPercent } from "../lib/formatters";
import type { DashboardView, ManagerRow } from "../lib/view";

type TeamPageProps = {
  view: DashboardView;
};

export function TeamPage({ view }: TeamPageProps) {
  const managers = view.managers.filter((row) => row.count > 0 && row.name !== "Не указан");
  const masters = view.masters;
  const totalProfit = managers.reduce((total, row) => total + row.profit, 0);
  const totalCount = managers.reduce((total, row) => total + row.count, 0);
  const avgPerCar = totalCount ? totalProfit / totalCount : 0;
  const best = [...managers].filter((row) => row.count >= 5).sort((a, b) => b.profitPerCar - a.profitPerCar)[0];
  const maxProfit = Math.max(1, ...managers.map((row) => Math.abs(row.profit)));
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="stack">
      <section className="stat-strip">
        <div className="stat">
          <span>Менеджеров с продажами</span>
          <strong>{formatNumber(managers.length)}</strong>
          <small>в среднем {formatNumber(managers.length ? Math.round(totalCount / managers.length) : 0)} сделок на человека</small>
        </div>
        <div className="stat">
          <span>Прибыль на одну машину</span>
          <strong>{formatMoneyShort(avgPerCar)}</strong>
          <small>в среднем по команде</small>
        </div>
        <div className="stat">
          <span>Лучший по прибыли на машину</span>
          <strong className="stat__name">{best ? best.name : "—"}</strong>
          <small>{best ? `${formatMoneyShort(best.profitPerCar)} · ${formatNumber(best.count)} сделок` : "мало данных"}</small>
        </div>
        <div className="stat">
          <span>Мастеров-приёмщиков</span>
          <strong>{formatNumber(masters.length)}</strong>
          <small>{formatNumber(masters.reduce((total, row) => total + row.count, 0))} заказ-нарядов</small>
        </div>
      </section>

      <Panel title="Менеджеры по продажам" subtitle="Нажмите на строку, чтобы увидеть сделки менеджера. Прибыль включает допы, страховку и бонус импортёра">
        <div className="table-wrap">
          <table className="table team-table">
            <thead>
              <tr>
                <th>Менеджер</th>
                <th className="num">Сделок</th>
                <th>Валовая прибыль</th>
                <th className="num">На машину</th>
                <th className="num" title="Скидка от РРЦ">Скидка</th>
                <th className="num" title="Доля сделок с допоборудованием">Допы</th>
                <th className="num" title="Доля сделок со страховкой">Страховка</th>
                <th className="num" title="Средний срок на складе">Склад</th>
                <th className="num">В минус</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((row) => (
                <ManagerLine
                  key={row.name}
                  row={row}
                  maxProfit={maxProfit}
                  avgPerCar={avgPerCar}
                  isOpen={open === row.name}
                  onToggle={() => setOpen(open === row.name ? null : row.name)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note">
          Зелёным — прибыль на машину выше средней по команде. Высокая скидка при низких допах — повод для разговора, а не для выводов: сравнивайте с моделями и складом.
        </p>
      </Panel>

      <Panel title="Мастера-приёмщики" subtitle="Кто принимает машины в сервис и как закрывает заказ-наряды">
        <div className="legend-row">
          <span>Полоска — из чего состоят наряды мастера:</span>
          <KindLegend />
        </div>
        <div className="masters">
          {masters.map((row) => (
            <article className="master" key={row.name}>
              <header>
                <strong>{row.name}</strong>
                <span>{formatNumber(row.count)} заказ-нарядов</span>
              </header>
              <div className="master__split" aria-label="Типы заказ-нарядов">
                <i style={{ flex: row.clientCount, background: KIND_COLORS.client }} title={`Клиентские: ${row.clientCount}`} />
                <i style={{ flex: row.warrantyCount, background: KIND_COLORS.warranty }} title={`Гарантийные: ${row.warrantyCount}`} />
                <i style={{ flex: row.internalCount, background: KIND_COLORS.internal }} title={`Внутренние: ${row.internalCount}`} />
              </div>
              <small className="master__legend">
                <KindLegend client={row.clientCount} warranty={row.warrantyCount} internal={row.internalCount} />
              </small>
              <dl className="facts">
                <div><dt>Выручка с клиентов</dt><dd>{formatMoneyShort(row.clientRevenue)}</dd></div>
                <div><dt>Средний чек</dt><dd>{formatMoney(row.averageCheck)}</dd></div>
                <div><dt>Нормо-часов</dt><dd>{formatNumber(Math.round(row.hours))}</dd></div>
                <div><dt>Работы за нормо-час</dt><dd>{row.ratePerHour ? formatMoney(row.ratePerHour) : "—"}</dd></div>
                <div><dt>Средний срок</dt><dd>{formatDuration(row.averageDurationDays)}</dd></div>
                <div>
                  <dt>Позже плана</dt>
                  <dd className={row.lateCount ? "text-danger" : ""}>{formatNumber(row.lateCount)} · {formatPercent(row.lateShare, 1)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="callout">
          <Info size={16} aria-hidden="true" />
          <span>
            Механиков в выгрузке нет: в 1С заказ-наряд привязан только к мастеру-приёмщику. Чтобы увидеть выработку каждого механика, нужна выгрузка «Выработка исполнителей» — это следующий шаг пилота.
          </span>
        </div>
      </Panel>
    </div>
  );
}

function ManagerLine({ row, maxProfit, avgPerCar, isOpen, onToggle }: { row: ManagerRow; maxProfit: number; avgPerCar: number; isOpen: boolean; onToggle: () => void }) {
  const width = (Math.abs(row.profit) / maxProfit) * 100;
  return (
    <Fragment>
      <tr className={`is-clickable ${isOpen ? "is-open" : ""}`} onClick={onToggle} aria-expanded={isOpen}>
        <td className="nowrap">
          <span className="row-toggle">
            <ChevronRight size={14} aria-hidden="true" />
            <span>
              <span className="cell-main">{row.name}</span>
              <small className="cell-sub">{row.dealer}</small>
            </span>
          </span>
        </td>
        <td className="num">{formatNumber(row.count)}</td>
        <td className="team-table__bar">
          <span className={`inline-bar ${row.profit < 0 ? "is-negative" : ""}`}><i style={{ width: `${width}%` }} /></span>
          <b className={row.profit < 0 ? "text-danger" : ""}>{formatMoneyShort(row.profit)}</b>
        </td>
        <td className={`num nowrap ${row.profitPerCar < 0 ? "text-danger" : row.profitPerCar > avgPerCar ? "text-success" : ""}`}>{formatMoneyShort(row.profitPerCar)}</td>
        <td className="num">{formatPercent(row.discountShare, 1)}</td>
        <td className="num">{formatPercent(row.accessoriesAttach, 0)}</td>
        <td className="num">{formatPercent(row.insuranceAttach, 0)}</td>
        <td className="num nowrap">{formatNumber(Math.round(row.averageStockDays))} дн.</td>
        <td className={`num ${row.negativeCount ? "text-danger" : ""}`}>{formatNumber(row.negativeCount)}</td>
      </tr>
      {isOpen ? (
        <tr className="row-detail">
          <td colSpan={9}>
            <table className="table table--nested">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Автомобиль</th>
                  <th className="num">Склад</th>
                  <th className="num">Скидка</th>
                  <th className="num">Цена</th>
                  <th className="num">На машине</th>
                  <th className="num">Допы, страх., бонус</th>
                  <th className="num">Итог</th>
                </tr>
              </thead>
              <tbody>
                {row.deals.map((deal) => (
                  <tr key={deal.id}>
                    <td className="nowrap">{formatDate(deal.saleDate)}</td>
                    <td>
                      {deal.model}
                      {deal.isUsed ? <span className="tag tag--muted">с пробегом</span> : null}
                    </td>
                    <td className={`num nowrap ${deal.stockDays > 180 ? "text-danger" : deal.stockDays > 90 ? "text-warning" : ""}`}>{formatNumber(deal.stockDays)} дн.</td>
                    <td className="num nowrap">{deal.discount ? formatMoneyShort(deal.discount) : "—"}</td>
                    <td className="num nowrap">{formatMoneyShort(deal.salePrice)}</td>
                    <td className={`num nowrap ${deal.carMargin < 0 ? "text-danger" : ""}`}>{formatMoneyShort(deal.carMargin)}</td>
                    <td className="num nowrap">{formatMoneyShort(deal.margin - deal.carMargin)}</td>
                    <td className={`num nowrap ${deal.margin < 0 ? "text-danger" : "text-success"}`}><b>{formatMoneyShort(deal.margin)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
