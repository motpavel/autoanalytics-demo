import { VinSearch } from "../components/VinSearch";
import { Panel } from "../components/Panel";
import { formatMoney, formatNumber } from "../lib/formatters";
import type { DemoData } from "../lib/types";

type ClientsPageProps = {
  data: DemoData;
};

export function ClientsPage({ data }: ClientsPageProps) {
  const clients = data.clientCards.filter((client) => client.name !== "Клиент не указан").slice(0, 8);

  return (
    <div className="stack">
      <VinSearch vehicles={data.vehicleCards} />

      <Panel title="Самые частые клиенты сервиса" subtitle="Имена сокращены, телефоны и адреса не выводятся">
        <div className="client-grid">
          {clients.map((client) => (
            <article className="client-card" key={client.name}>
              <strong title={client.name}>{client.name}</strong>
              <small className="mono">{client.vins.slice(0, 3).join(" · ")}</small>
              <dl>
                <div>
                  <dt>Авто</dt>
                  <dd>{formatNumber(client.vehiclesCount)}</dd>
                </div>
                <div>
                  <dt>Заезды</dt>
                  <dd>{formatNumber(client.serviceOrdersCount)}</dd>
                </div>
                <div>
                  <dt>Платно</dt>
                  <dd>{formatMoney(client.paidRepairAmount)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
