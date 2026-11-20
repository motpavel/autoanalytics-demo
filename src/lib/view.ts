import type { DemoData, Insight, NamedMetric, SaleRecord, ServiceOrder } from "./types";
import { formatMoneyShort, formatNumber, formatPercent, pluralRu } from "./formatters";

export type PeriodId = "all" | "2026-05" | "2026-06";

export const PERIODS: Array<{ id: PeriodId; label: string; range: string; from: string; to: string }> = [
  { id: "all", label: "Май — июнь", range: "01.05.2026 — 30.06.2026", from: "2026-05-01", to: "2026-06-30" },
  { id: "2026-05", label: "Май", range: "01.05.2026 — 31.05.2026", from: "2026-05-01", to: "2026-05-31" },
  { id: "2026-06", label: "Июнь", range: "01.06.2026 — 30.06.2026", from: "2026-06-01", to: "2026-06-30" },
];

export function getPeriod(id: PeriodId) {
  return PERIODS.find((period) => period.id === id) || PERIODS[0];
}

export type WeekPoint = {
  key: string;
  label: string;
  range: string;
  count: number;
  amount: number;
  warranty: number;
  commercial: number;
  internal: number;
  cumulative: number;
  cumulativeAmount: number;
};

function inPeriod(month: string, period: PeriodId) {
  return period === "all" || month === period;
}

export function groupMetric<T>(rows: T[], key: (row: T) => string, amount: (row: T) => number = () => 0): NamedMetric[] {
  const map = new Map<string, NamedMetric>();
  rows.forEach((row) => {
    const name = key(row) || "Не указано";
    const current = map.get(name) || { name, count: 0, amount: 0, share: 0 };
    current.count += 1;
    current.amount += amount(row) || 0;
    map.set(name, current);
  });
  const total = rows.length || 1;
  return [...map.values()]
    .map((item) => ({ ...item, share: (item.count / total) * 100 }))
    .sort((a, b) => b.count - a.count || b.amount - a.amount);
}

function parseIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shortDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Недельные корзины (пн–вс), обрезанные границами периода. */
function buildWeeks(period: PeriodId, sales: SaleRecord[], orders: ServiceOrder[]): WeekPoint[] {
  const { from, to } = getPeriod(period);
  const start = parseIso(from);
  const end = parseIso(to);
  const weeks: WeekPoint[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + ((7 - weekEnd.getDay()) % 7));
    if (weekEnd > end) weekEnd.setTime(end.getTime());
    weeks.push({
      key: toIso(cursor),
      label: shortDate(cursor),
      range: `${shortDate(cursor)} — ${shortDate(weekEnd)}`,
      count: 0,
      amount: 0,
      warranty: 0,
      commercial: 0,
      internal: 0,
      cumulative: 0,
      cumulativeAmount: 0,
    });
    cursor = new Date(weekEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  const findWeek = (iso: string) => {
    for (let index = weeks.length - 1; index >= 0; index -= 1) {
      if (iso >= weeks[index].key) return weeks[index];
    }
    return undefined;
  };

  sales.forEach((sale) => {
    const week = sale.saleDate ? findWeek(sale.saleDate) : undefined;
    if (!week) return;
    week.count += 1;
    week.amount += sale.salePrice;
  });
  orders.forEach((order) => {
    const week = order.closeDate ? findWeek(order.closeDate) : undefined;
    if (!week) return;
    if (order.kind === "warranty") week.warranty += 1;
    else if (order.kind === "internal") week.internal += 1;
    else week.commercial += 1;
  });

  let cumulative = 0;
  let cumulativeAmount = 0;
  weeks.forEach((week) => {
    cumulative += week.count;
    cumulativeAmount += week.amount;
    week.cumulative = cumulative;
    week.cumulativeAmount = cumulativeAmount;
  });
  return weeks;
}

function growth(current: number, previous: number) {
  return previous ? ((current - previous) / previous) * 100 : null;
}

export type DashboardView = ReturnType<typeof buildView>;

export function buildView(data: DemoData, period: PeriodId, dealer = "all") {
  const byDealer = (sale: SaleRecord) => dealer === "all" || sale.dealer === dealer;
  const sales = data.sales.filter((sale) => inPeriod(sale.month, period) && byDealer(sale));
  const orders = data.serviceOrders.filter((order) => inPeriod(order.month, period));

  const salesAmount = sales.reduce((sum, sale) => sum + sale.salePrice, 0);
  const salesMargin = sales.reduce((sum, sale) => sum + sale.margin, 0);
  const warranty = orders.filter((order) => order.isWarranty);
  const commercial = orders.filter((order) => order.kind === "client");
  const internal = orders.filter((order) => order.kind === "internal");
  const withDates = orders.filter((order) => order.hasRepairDates);
  const late = orders.filter((order) => order.isLate);
  const durations = orders.map((order) => order.durationDays).filter((value): value is number => typeof value === "number");
  const warrantyDurations = warranty
    .map((order) => order.durationDays)
    .filter((value): value is number => typeof value === "number");
  const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

  const serviceVins = new Set(data.serviceOrders.map((order) => order.vin).filter(Boolean));
  const salesVins = new Set(sales.map((sale) => sale.vin).filter(Boolean));
  const vinOverlap = [...salesVins].filter((vin) => serviceVins.has(vin)).length;

  // Сравнение июня с маем (для «Май — июнь» и «Июнь»). Для мая сравнивать не с чем.
  const compare = period !== "2026-05";
  const monthSales = (month: string) => data.sales.filter((sale) => sale.month === month && byDealer(sale));
  const monthOrders = (month: string) => data.serviceOrders.filter((order) => order.month === month);
  const sum = (rows: SaleRecord[]) => rows.reduce((total, sale) => total + sale.salePrice, 0);
  const deltas = compare
    ? {
        salesCount: growth(monthSales("2026-06").length, monthSales("2026-05").length),
        salesAmount: growth(sum(monthSales("2026-06")), sum(monthSales("2026-05"))),
        orders: growth(monthOrders("2026-06").length, monthOrders("2026-05").length),
      }
    : { salesCount: null, salesAmount: null, orders: null };

  const weeks = buildWeeks(period, sales, orders);
  const salesByModel = groupMetric(sales, (sale) => sale.model, (sale) => sale.salePrice);
  const serviceByModel = groupMetric(orders, (order) => order.model, (order) => order.totalAmount);
  const lateByModel = groupMetric(late, (order) => order.model);
  const negativeMargin = sales.filter((sale) => sale.margin < 0);

  const metrics = {
    salesCount: sales.length,
    salesAmount,
    averagePrice: sales.length ? salesAmount / sales.length : 0,
    margin: salesMargin,
    marginPercent: salesAmount ? (salesMargin / salesAmount) * 100 : 0,
    usedCount: sales.filter((sale) => sale.isUsed).length,
    newCount: sales.filter((sale) => !sale.isUsed).length,
    negativeMarginCount: negativeMargin.length,
    ordersCount: orders.length,
    warrantyCount: warranty.length,
    commercialCount: commercial.length,
    warrantyShare: orders.length ? (warranty.length / orders.length) * 100 : 0,
    commercialShare: orders.length ? (commercial.length / orders.length) * 100 : 0,
    commercialAmount: commercial.reduce((total, order) => total + order.totalAmount, 0),
    internalCount: internal.length,
    internalShare: orders.length ? (internal.length / orders.length) * 100 : 0,
    carMargin: sales.reduce((total, sale) => total + sale.carMargin, 0),
    carMarginNegativeCount: sales.filter((sale) => sale.carMargin < 0).length,
    lateCount: late.length,
    lateShare: withDates.length ? (late.length / withDates.length) * 100 : 0,
    averageRepairDays: average(durations),
    averageWarrantyRepairDays: average(warrantyDurations),
    vinOverlap,
    salesWithVin: salesVins.size,
  };

  const insights: Insight[] = [];
  if (metrics.lateCount) {
    insights.push({
      type: "risk",
      title: `${formatNumber(metrics.lateCount)} ${pluralRu(metrics.lateCount, "заказ-наряд", "заказ-наряда", "заказ-нарядов")} позже плана`,
      text: `${formatPercent(metrics.lateShare, 1)} нарядов с датами, срок выдачи сорван`,
      tab: "service",
    });
  }
  if (negativeMargin.length) {
    insights.push({
      type: "warning",
      title: `${formatNumber(negativeMargin.length)} ${pluralRu(negativeMargin.length, "сделка", "сделки", "сделок")} в минус`,
      text: `убыточны даже с допами, страховкой и бонусом — ${formatPercent((negativeMargin.length / Math.max(sales.length, 1)) * 100, 0)} продаж`,
      tab: "sales",
    });
  }
  const agedSold = sales.filter((sale) => !sale.isUsed && sale.stockDays > 180);
  if (agedSold.length) {
    const agedProfit = agedSold.reduce((sum, sale) => sum + sale.margin, 0);
    insights.push({
      type: "risk",
      title: `${formatNumber(agedSold.length)} ${pluralRu(agedSold.length, "машина стояла", "машины стояли", "машин стояли")} на складе 180+ дней`,
      text: `итог по ним ${formatMoneyShort(agedProfit)} — их продавали с большой скидкой`,
      tab: "sales",
    });
  }
  if (salesByModel[0]) {
    insights.push({
      type: "success",
      title: `${salesByModel[0].name} — лидер продаж`,
      text: `${formatNumber(salesByModel[0].count)} шт., ${formatPercent(salesByModel[0].share, 0)} всех продаж`,
      tab: "sales",
    });
  }
  if (serviceByModel[0]) {
    insights.push({
      type: "info",
      title: `${serviceByModel[0].name} — лидер по заездам`,
      text: `${formatNumber(serviceByModel[0].count)} заказ-нарядов, ${formatPercent(serviceByModel[0].share, 0)} всего сервиса`,
      tab: "service",
    });
  }
  insights.push({
    type: "success",
    title: `${formatNumber(vinOverlap)} проданных авто уже в сервисе`,
    text: `из ${formatNumber(salesVins.size)} продаж с VIN, связка по VIN`,
    tab: "clients",
  });

  return {
    period,
    dealer,
    sales,
    orders,
    metrics,
    deltas,
    weeks,
    salesByDealer: groupMetric(sales, (sale) => shortDealer(sale.dealer), (sale) => sale.salePrice),
    salesByManager: groupMetric(sales, (sale) => sale.manager, (sale) => sale.salePrice),
    salesByModel,
    serviceByModel,
    warrantyByModel: groupMetric(warranty, (order) => order.model, (order) => order.totalAmount),
    lateByModel,
    latestSales: [...sales].sort((a, b) => b.saleDate.localeCompare(a.saleDate)),
    latestOrders: [...orders].sort((a, b) => b.closeDate.localeCompare(a.closeDate)),
    insights,
    economics: buildEconomics(sales),
    managers: buildManagers(sales),
    masters: buildMasters(orders),
    stock: buildStock(sales),
    load: buildLoad(orders),
    repeats: buildRepeats(orders),
    serviceMonths: buildServiceMonths(orders),
  };
}

const sumBy = <T,>(rows: T[], get: (row: T) => number) => rows.reduce((total, row) => total + (get(row) || 0), 0);

/** Из чего складывается прибыль сделки: машина → допы → страхование/кредит → бонус. */
function buildEconomics(sales: SaleRecord[]) {
  const car = sumBy(sales, (sale) => sale.carMargin);
  const accessories = sumBy(sales, (sale) => sale.accessoriesMargin);
  const finance = sumBy(sales, (sale) => sale.financeMargin);
  const bonus = sumBy(sales, (sale) => sale.bonus);
  const total = car + accessories + finance + bonus;
  const revenue = sumBy(sales, (sale) => sale.salePrice);
  const rrp = sumBy(sales, (sale) => sale.rrp);
  const discount = sumBy(sales, (sale) => sale.discount);
  return {
    steps: [
      { name: "Маржа на машине", value: car, kind: "start" as const },
      { name: "Допоборудование", value: accessories, kind: "step" as const },
      { name: "Страхование и кредит", value: finance, kind: "step" as const },
      { name: "Бонус импортёра", value: bonus, kind: "step" as const },
      { name: "Итого прибыль", value: total, kind: "total" as const },
    ],
    car,
    total,
    revenue,
    discount,
    discountShare: rrp ? (discount / rrp) * 100 : 0,
    importerCompensation: sumBy(sales, (sale) => sale.importerCompensation),
    multiplier: car > 0 ? total / car : null,
    accessoriesAttach: sales.length ? (sales.filter((sale) => sale.accessoriesRevenue > 0).length / sales.length) * 100 : 0,
    insuranceAttach: sales.length ? (sales.filter((sale) => sale.hasInsurance).length / sales.length) * 100 : 0,
    tradeInShare: sales.length ? (sales.filter((sale) => sale.isTradeIn).length / sales.length) * 100 : 0,
  };
}

export type ManagerRow = ReturnType<typeof buildManagers>[number];

function buildManagers(sales: SaleRecord[]) {
  const map = new Map<string, SaleRecord[]>();
  sales.forEach((sale) => map.set(sale.manager, [...(map.get(sale.manager) || []), sale]));
  return [...map.entries()]
    .map(([name, rows]) => {
      const revenue = sumBy(rows, (sale) => sale.salePrice);
      const profit = sumBy(rows, (sale) => sale.margin);
      const rrp = sumBy(rows, (sale) => sale.rrp);
      const newCars = rows.filter((sale) => !sale.isUsed);
      return {
        name,
        dealer: shortDealer(groupMetric(rows, (sale) => sale.dealer)[0]?.name || ""),
        count: rows.length,
        revenue,
        profit,
        profitPerCar: rows.length ? profit / rows.length : 0,
        profitPercent: revenue ? (profit / revenue) * 100 : 0,
        carMargin: sumBy(rows, (sale) => sale.carMargin),
        discountShare: rrp ? (sumBy(rows, (sale) => sale.discount) / rrp) * 100 : 0,
        accessoriesAttach: rows.length ? (rows.filter((sale) => sale.accessoriesRevenue > 0).length / rows.length) * 100 : 0,
        insuranceAttach: rows.length ? (rows.filter((sale) => sale.hasInsurance).length / rows.length) * 100 : 0,
        averageStockDays: rows.length ? sumBy(rows, (sale) => sale.stockDays) / rows.length : 0,
        negativeCount: rows.filter((sale) => sale.margin < 0).length,
        agedLossCount: rows.filter((sale) => sale.margin < 0 && sale.stockDays > 180).length,
        agedLoss: sumBy(rows.filter((sale) => sale.margin < 0 && sale.stockDays > 180), (sale) => sale.margin),
        deals: [...rows].sort((a, b) => a.margin - b.margin),
        usedShare: rows.length ? ((rows.length - newCars.length) / rows.length) * 100 : 0,
      };
    })
    .filter((row) => row.name !== "Не указан" || row.count > 0)
    .sort((a, b) => b.profit - a.profit);
}

export type MasterRow = ReturnType<typeof buildMasters>[number];

function buildMasters(orders: ServiceOrder[]) {
  const map = new Map<string, ServiceOrder[]>();
  orders.forEach((order) => map.set(order.master, [...(map.get(order.master) || []), order]));
  return [...map.entries()]
    .map(([name, rows]) => {
      const client = rows.filter((order) => order.kind === "client");
      const withDates = rows.filter((order) => order.hasRepairDates);
      const late = rows.filter((order) => order.isLate);
      const durations = rows.map((order) => order.durationDays).filter((value): value is number => typeof value === "number");
      const clientWork = sumBy(client, (order) => order.workAmount);
      const clientHours = sumBy(client, (order) => order.hours);
      return {
        name,
        count: rows.length,
        clientCount: client.length,
        warrantyCount: rows.filter((order) => order.kind === "warranty").length,
        internalCount: rows.filter((order) => order.kind === "internal").length,
        clientRevenue: sumBy(client, (order) => order.totalAmount),
        averageCheck: client.length ? sumBy(client, (order) => order.totalAmount) / client.length : 0,
        hours: sumBy(rows, (order) => order.hours),
        ratePerHour: clientHours ? clientWork / clientHours : 0,
        lateCount: late.length,
        lateShare: withDates.length ? (late.length / withDates.length) * 100 : 0,
        averageDurationDays: durations.length ? durations.reduce((total, value) => total + value, 0) / durations.length : 0,
      };
    })
    .filter((row) => row.name && row.name !== "Не указан")
    .sort((a, b) => b.count - a.count);
}

/** Склад: сколько дней машина простояла до продажи и что стало с прибылью. */
function buildStock(sales: SaleRecord[]) {
  const newCars = sales.filter((sale) => !sale.isUsed && sale.stockDays > 0);
  const buckets = [
    { name: "до 30 дней", min: 0, max: 30 },
    { name: "31–90 дней", min: 31, max: 90 },
    { name: "91–180 дней", min: 91, max: 180 },
    { name: "больше 180", min: 181, max: Infinity },
  ].map((bucket) => {
    const rows = newCars.filter((sale) => sale.stockDays >= bucket.min && sale.stockDays <= bucket.max);
    const revenue = sumBy(rows, (sale) => sale.salePrice);
    const profit = sumBy(rows, (sale) => sale.margin);
    return { name: bucket.name, count: rows.length, profitPerCar: rows.length ? profit / rows.length : 0, profitPercent: revenue ? (profit / revenue) * 100 : 0 };
  });
  return {
    averageDays: newCars.length ? sumBy(newCars, (sale) => sale.stockDays) / newCars.length : 0,
    over90: newCars.filter((sale) => sale.stockDays > 90).length,
    over180: newCars.filter((sale) => sale.stockDays > 180).length,
    buckets,
    aged: [...newCars].filter((sale) => sale.stockDays > 90).sort((a, b) => b.stockDays - a.stockDays),
  };
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Загрузка приёмки: день недели × час начала работ. */
function buildLoad(orders: ServiceOrder[]) {
  const hours = Array.from({ length: 12 }, (_, index) => index + 8);
  const grid = WEEKDAYS.map(() => hours.map(() => 0));
  orders.forEach((order) => {
    if (order.startWeekday === null || order.startHour === null) return;
    const hourIndex = Math.min(Math.max(order.startHour, 8), 19) - 8;
    grid[order.startWeekday][hourIndex] += 1;
  });
  const byDay = grid.map((row) => row.reduce((total, value) => total + value, 0));
  const byHour = hours.map((_, index) => grid.reduce((total, row) => total + row[index], 0));
  return {
    weekdays: WEEKDAYS,
    hours,
    grid,
    max: Math.max(1, ...grid.flat()),
    peakDay: WEEKDAYS[byDay.indexOf(Math.max(...byDay))],
    peakHour: hours[byHour.indexOf(Math.max(...byHour))],
  };
}

/** Повторные заезды одной машины за период. */
function buildRepeats(orders: ServiceOrder[]) {
  const map = new Map<string, ServiceOrder[]>();
  orders
    .filter((order) => order.vin && order.kind !== "internal")
    .forEach((order) => map.set(order.vin, [...(map.get(order.vin) || []), order]));
  const vehicles = [...map.values()];
  const repeated = vehicles.filter((rows) => rows.length > 1);
  const count = (min: number, max = Infinity) => vehicles.filter((rows) => rows.length >= min && rows.length <= max).length;
  const repeatedOrders = repeated.flat();
  return {
    vehicles: vehicles.length,
    repeated: repeated.length,
    threePlus: repeated.filter((rows) => rows.length >= 3).length,
    share: vehicles.length ? (repeated.length / vehicles.length) * 100 : 0,
    distribution: [
      { name: "1 визит", count: count(1, 1) },
      { name: "2 визита", count: count(2, 2) },
      { name: "3 визита", count: count(3, 3) },
      { name: "4 и больше", count: count(4) },
    ],
    repeatedWarrantyShare: repeatedOrders.length ? (repeatedOrders.filter((order) => order.kind === "warranty").length / repeatedOrders.length) * 100 : 0,
    repeatedRevenue: sumBy(repeatedOrders.filter((order) => order.kind === "client"), (order) => order.totalAmount),
    top: [...repeated]
      .sort((a, b) => b.length - a.length)
      .slice(0, 6)
      .map((rows) => ({
        vin: rows[0].vin,
        vinMasked: rows[0].vinMasked,
        model: rows[0].model,
        visits: rows.length,
        warranty: rows.filter((order) => order.kind === "warranty").length,
        client: rows.filter((order) => order.kind === "client").length,
        amount: sumBy(rows, (order) => order.totalAmount),
      })),
  };
}

const MONTH_LABELS: Record<string, string> = { "2026-05": "Май", "2026-06": "Июнь" };

/** Нагрузка сервиса помесячно. */
function buildServiceMonths(orders: ServiceOrder[]) {
  const months = [...new Set(orders.map((order) => order.month).filter(Boolean))].sort();
  return months.map((month) => {
    const rows = orders.filter((order) => order.month === month);
    const client = rows.filter((order) => order.kind === "client");
    const withDates = rows.filter((order) => order.hasRepairDates);
    const late = rows.filter((order) => order.isLate);
    const days = new Set(rows.map((order) => order.closeDate).filter(Boolean)).size;
    return {
      month,
      label: MONTH_LABELS[month] || month,
      count: rows.length,
      client: client.length,
      warranty: rows.filter((order) => order.kind === "warranty").length,
      internal: rows.filter((order) => order.kind === "internal").length,
      clientRevenue: sumBy(client, (order) => order.totalAmount),
      hours: sumBy(rows, (order) => order.hours),
      perDay: days ? rows.length / days : 0,
      lateShare: withDates.length ? (late.length / withDates.length) * 100 : 0,
    };
  });
}

export function shortDealer(dealer: string) {
  return dealer.replace(/^ДЦ\s*/, "");
}

export function dealersOf(data: DemoData) {
  return groupMetric(data.sales, (sale) => sale.dealer).map((item) => item.name);
}
