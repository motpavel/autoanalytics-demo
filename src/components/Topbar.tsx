import { CalendarDays } from "lucide-react";
import type { TabId } from "../lib/types";
import { Segmented } from "./Segmented";
import { getPeriod, PERIODS, type PeriodId } from "../lib/view";

const titles: Record<TabId, { title: string; subtitle: string }> = {
  overview: { title: "Обзор", subtitle: "Продажи и сервис на одном экране" },
  sales: { title: "Продажи", subtitle: "Динамика, дилерские центры, менеджеры и модели" },
  service: { title: "Сервис", subtitle: "Заказ-наряды, гарантия и соблюдение сроков" },
  team: { title: "Команда", subtitle: "Как работают менеджеры по продажам и мастера-приёмщики" },
  clients: { title: "Клиенты и авто", subtitle: "История автомобиля по VIN: от продажи до сервиса" },
  ai: { title: "ИИ-анализ", subtitle: "Вопросы к данным обычным языком" },
};

type TopbarProps = {
  activeTab: TabId;
  period: PeriodId;
  onPeriodChange: (period: PeriodId) => void;
};

export function Topbar({ activeTab, period, onPeriodChange }: TopbarProps) {
  const title = titles[activeTab];
  const usesPeriod = activeTab === "overview" || activeTab === "sales" || activeTab === "service" || activeTab === "team";

  return (
    <header className="topbar">
      <div className="topbar__title">
        <h1>{title.title}</h1>
        <p>{title.subtitle}</p>
      </div>
      {usesPeriod ? (
        <div className="topbar__actions">
          <span className="topbar__range">
            <CalendarDays size={16} aria-hidden="true" />
            {getPeriod(period).range}
          </span>
          <Segmented label="Период" value={period} onChange={onPeriodChange} options={PERIODS.map(({ id, label }) => ({ id, label }))} />
        </div>
      ) : null}
    </header>
  );
}
