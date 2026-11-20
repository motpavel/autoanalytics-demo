import { CheckCircle2, FileSpreadsheet, TriangleAlert } from "lucide-react";
import { AssistantPanel } from "../components/AssistantPanel";
import { Panel } from "../components/Panel";
import { plural } from "../lib/formatters";
import type { DemoData } from "../lib/types";

type AiAnalysisPageProps = {
  data: DemoData;
};

function fileLabel(name: string) {
  return name.replace(/\.xlsx$/i, "");
}

export function AiAnalysisPage({ data }: AiAnalysisPageProps) {
  const { metrics } = data;
  const quality = [
    {
      ok: true,
      text: `${plural(metrics.totalSalesCount, "продажа", "продажи", "продаж")} и ${plural(metrics.serviceOrdersCount, "заказ-наряд", "заказ-наряда", "заказ-нарядов")} распознаны`,
    },
    {
      ok: true,
      text: `${plural(metrics.vinOverlapCount, "автомобиль", "автомобиля", "автомобилей")} из продаж найдены в сервисе по VIN`,
    },
    {
      ok: false,
      text: `${plural(metrics.salesWithoutVinCount, "продажа", "продажи", "продаж")} без VIN в выгрузке (в основном авто с пробегом), их нельзя связать с сервисом`,
    },
    {
      ok: false,
      text: `${plural(metrics.ordersWithoutDatesCount, "заказ-наряд", "заказ-наряда", "заказ-нарядов")} без полного набора дат: просрочка для них не считается`,
    },
  ];

  return (
    <div className="ai-layout">
      <AssistantPanel compact />

      <div className="stack">
        <Panel title="Источник данных" subtitle="Демонстрационный снимок · май–июнь 2026">
          <ul className="file-list">
            {[...data.sources.sales, ...data.sources.service].map((file) => (
              <li key={file}>
                <FileSpreadsheet size={18} aria-hidden="true" />
                <span>{fileLabel(file)}</span>
                <small>.xlsx</small>
              </li>
            ))}
          </ul>
          <p className="panel-note">
            Имена, VIN и номера заказ-нарядов заменены демонстрационными обозначениями.
            Показатели и связи между продажами и сервисом сохранены.
          </p>
        </Panel>

        <Panel title="Качество данных">
          <ul className="quality-list">
            {quality.map((item) => (
              <li key={item.text} className={item.ok ? "is-ok" : "is-warn"}>
                {item.ok ? <CheckCircle2 size={17} aria-hidden="true" /> : <TriangleAlert size={17} aria-hidden="true" />}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
