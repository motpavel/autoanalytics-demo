import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, formatDuration, formatMoney, formatNumber, repairTagClass } from "../lib/formatters";
import type { VehicleCard } from "../lib/types";
import { Panel } from "./Panel";
import { Segmented } from "./Segmented";

type VinSearchProps = {
  vehicles: VehicleCard[];
};

type Scope = "linked" | "all";

export function VinSearch({ vehicles }: VinSearchProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("linked");
  const [selectedVin, setSelectedVin] = useState<string | null>(null);
  const [openVisit, setOpenVisit] = useState<string | null>(null);

  const linkedCount = useMemo(() => vehicles.filter((vehicle) => vehicle.linkedToSale && vehicle.serviceCount > 0).length, [vehicles]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const pool = scope === "linked" ? vehicles.filter((vehicle) => vehicle.linkedToSale && vehicle.serviceCount > 0) : vehicles;
    if (!normalized) return pool.slice(0, 40);
    return pool
      .filter((vehicle) =>
        [vehicle.vin, vehicle.model, vehicle.brand, vehicle.customerDisplay, vehicle.sale?.dealer, vehicle.sale?.manager]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 40);
  }, [query, scope, vehicles]);

  const selected = filtered.find((vehicle) => vehicle.vin === selectedVin) || filtered[0];

  return (
    <div className="vin-layout">
      <Panel className="vin-list-panel" title="Поиск автомобиля">
        <div className="vin-list-panel__controls">
          <label className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="VIN, модель, клиент или менеджер"
              aria-label="Поиск по VIN, модели, клиенту или менеджеру"
            />
          </label>
          <Segmented
            size="sm"
            wide
            label="Какие автомобили показать"
            value={scope}
            onChange={setScope}
            options={[
              { id: "linked", label: `Продажа + сервис · ${formatNumber(linkedCount)}` },
              { id: "all", label: `Все · ${formatNumber(vehicles.length)}` },
            ]}
          />
        </div>
        <div className="vehicle-list">
          {filtered.length ? (
            filtered.map((vehicle) => (
              <button
                className={`vehicle-row ${vehicle.vin === selected?.vin ? "is-selected" : ""}`}
                key={vehicle.vin}
                type="button"
                onClick={() => {
                  setSelectedVin(vehicle.vin);
                  setOpenVisit(null);
                }}
              >
                <span className="vehicle-row__text">
                  <strong>{vehicle.model}</strong>
                  <small>VIN {vehicle.vinMasked} · {vehicle.customerDisplay || "клиент не указан"}</small>
                </span>
                <span className="vehicle-row__count" title="Заездов в сервис">{formatNumber(vehicle.serviceCount)}</span>
              </button>
            ))
          ) : (
            <p className="empty-state">Ничего не найдено. Попробуйте последние 4 символа VIN.</p>
          )}
        </div>
      </Panel>

      <Panel className="vin-card-panel" title="Карточка автомобиля">
        {selected ? (
          <>
            <div className="vehicle-hero">
              <div>
                <h2>{selected.model}</h2>
                <p className="mono">VIN {selected.vin}</p>
                <p>{selected.customerDisplay || "Клиент не указан"}</p>
              </div>
              <span className={`status-pill ${selected.linkedToSale ? "status-pill--ok" : ""}`}>
                {selected.linkedToSale ? "Куплен у нас" : "Только сервис"}
              </span>
            </div>

            {selected.sale ? (
              <div className="sale-box">
                <span>
                  <small>Продажа</small>
                  <b>{formatDate(selected.sale.date)}</b>
                </span>
                <span>
                  <small>Дилерский центр</small>
                  <b>{selected.sale.dealer}</b>
                </span>
                <span>
                  <small>Менеджер</small>
                  <b>{selected.sale.manager}</b>
                </span>
                <span>
                  <small>Цена без НДС</small>
                  <b>{formatMoney(selected.sale.price)}</b>
                </span>
              </div>
            ) : null}

            <div className="vehicle-stats">
              <span><b>{formatNumber(selected.serviceCount)}</b>заездов</span>
              <span><b>{formatNumber(selected.warrantyCount)}</b>гарантийных</span>
              <span><b>{formatNumber(selected.commercialCount)}</b>клиентских</span>
              <span><b>{formatMoney(selected.paidRepairAmount)}</b>платные ремонты</span>
            </div>

            <h3 className="section-title">
              История сервиса <small>последний визит {formatDate(selected.lastVisit)}</small>
            </h3>
            {selected.serviceHistory.length ? (
              <div className="visit-cards">
                {selected.serviceHistory.map((item, index) => {
                  const key = `${item.orderNumber}-${item.closeDate}`;
                  const isOpen = openVisit === key;
                  const kind = item.repairCategory === "Гарантийный" ? "warranty" : item.repairCategory === "Внутренний" ? "internal" : "client";
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`visit-card visit-card--${kind} ${isOpen ? "is-open" : ""}`}
                      onClick={() => setOpenVisit(isOpen ? null : key)}
                      aria-expanded={isOpen}
                    >
                      <span className="visit-card__top">
                        <span className="visit-card__no">Визит {selected.serviceHistory.length - index}</span>
                        <span className={repairTagClass(item.repairCategory)}>{item.repairCategory}</span>
                      </span>
                      <span className="visit-card__date">{item.closeDate ? formatDate(item.closeDate) : "в работе"}</span>
                      <span className="visit-card__type">{item.repairType}</span>
                      <span className="visit-card__bottom">
                        <b>{formatMoney(item.totalAmount)}</b>
                        <span className={item.isLate ? "text-danger" : ""}>{item.isLate ? "позже плана" : formatDuration(item.durationDays)}</span>
                      </span>
                      {isOpen ? (
                        <span className="visit-card__details">
                          <span><small>Заказ-наряд</small><b className="mono">{item.orderNumber}</b></span>
                          <span><small>Мастер</small><b>{item.master || "—"}</b></span>
                          <span><small>Пробег</small><b>{item.mileage ? `${formatNumber(item.mileage)} км` : "—"}</b></span>
                          <span><small>Нормо-часы</small><b>{item.hours ? formatNumber(item.hours, 1) : "—"}</b></span>
                          <span><small>Работы</small><b>{formatMoney(item.workAmount)}</b></span>
                          <span><small>Запчасти</small><b>{formatMoney(item.partsAmount)}</b></span>
                          {item.reason ? <span className="visit-card__reason"><small>Причина обращения</small>{item.reason}</span> : null}
                        </span>
                      ) : (
                        <span className="visit-card__more">Подробнее</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="empty-state">Автомобиль ещё не заезжал в сервис.</p>
            )}
          </>
        ) : (
          <p className="empty-state">Выберите автомобиль слева</p>
        )}
      </Panel>
    </div>
  );
}
