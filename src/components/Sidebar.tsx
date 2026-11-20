import { BarChart3, Bot, CarFront, FileSpreadsheet, Home, UsersRound, Wrench } from "lucide-react";
import type { DemoData, TabId } from "../lib/types";

const items: Array<{ id: TabId; label: string; icon: typeof Home }> = [
  { id: "overview", label: "Обзор", icon: Home },
  { id: "sales", label: "Продажи", icon: BarChart3 },
  { id: "service", label: "Сервис", icon: Wrench },
  { id: "team", label: "Команда", icon: UsersRound },
  { id: "clients", label: "Клиенты и авто", icon: CarFront },
  { id: "ai", label: "ИИ-анализ", icon: Bot },
];

type SidebarProps = {
  activeTab: TabId;
  data: DemoData;
  onTabChange: (tab: TabId) => void;
};

export function Sidebar({ activeTab, data, onTabChange }: SidebarProps) {
  const filesCount = data.sources.sales.length + data.sources.service.length;

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <span className="sidebar__mark" aria-hidden="true" />
        <span>AutoAnalytics</span>
      </div>

      <nav className="sidebar__nav" aria-label="Разделы">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              className={`sidebar__item ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button className="source-card" type="button" onClick={() => onTabChange("ai")}>
        <span className="source-card__icon">
          <FileSpreadsheet size={18} aria-hidden="true" />
        </span>
        <span className="source-card__text">
          <strong>Демонстрационные данные</strong>
          <small>{filesCount} выгрузки из 1С · обезличено</small>
          <small>май — июнь 2026</small>
        </span>
      </button>
    </aside>
  );
}
