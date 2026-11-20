import { readFileSync } from 'node:fs';

export const data = JSON.parse(readFileSync(new URL('../src/data/demo-data.json', import.meta.url), 'utf8'));
export const periods = ['all', '2026-05', '2026-06'];
const round = (n, digits = 2) => Number(n.toFixed(digits));
const sum = (rows, key) => round(rows.reduce((n, row) => n + (Number(row[key]) || 0), 0));
const average = (rows, key, digits = 2) => {
  const values = rows.map(row => row[key]).filter(value => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((a, b) => a + b, 0) / values.length, digits) : null;
};
const percent = (count, total) => total ? round(count / total * 100) : null;
const normalize = value => String(value ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[\s._-]+/g, '');
const sourcesFor = (dataset, period) => data.sources[dataset].filter(name =>
  period === 'all' || (period === '2026-05' ? /май/i.test(name) : /июнь/i.test(name)));
const fields = {
  sales: ['month', 'saleDate', 'dealer', 'manager', 'clientDisplay', 'model', 'isUsed', 'salePrice', 'margin', 'marginPercent', 'carMargin', 'rrp', 'discount', 'importerCompensation', 'accessoriesRevenue', 'accessoriesMargin', 'financeMargin', 'bonus', 'hasInsurance', 'hasCredit', 'isTradeIn', 'stockDays', 'vinMasked'],
  service: ['month', 'closeDate', 'brand', 'model', 'repairType', 'repairCategory', 'kind', 'isWarranty', 'master', 'totalAmount', 'workAmount', 'partsAmount', 'hours', 'mileage', 'durationDays', 'isLate', 'hasRepairDates', 'startWeekday', 'startHour', 'vinMasked'],
};

function summarize(dataset, rows) {
  if (dataset === 'sales') {
    const revenue = sum(rows, 'salePrice');
    const profit = sum(rows, 'margin');
    return {
      count: rows.length, revenue, profit, profitPercent: revenue ? round(profit / revenue * 100) : null,
      averagePrice: average(rows, 'salePrice'), carMargin: sum(rows, 'carMargin'),
      accessoriesMargin: sum(rows, 'accessoriesMargin'), financeMargin: sum(rows, 'financeMargin'),
      bonus: sum(rows, 'bonus'), discount: sum(rows, 'discount'), importerCompensation: sum(rows, 'importerCompensation'),
      usedCount: rows.filter(row => row.isUsed).length,
      negativeProfitCount: rows.filter(row => row.margin < 0).length,
      insuranceCount: rows.filter(row => row.hasInsurance).length,
      creditCount: rows.filter(row => row.hasCredit).length,
      tradeInCount: rows.filter(row => row.isTradeIn).length,
      averageStockDays: average(rows, 'stockDays'),
      missingVinCount: rows.filter(row => !row.vin).length,
    };
  }
  const dated = rows.filter(row => row.hasRepairDates);
  const warranty = rows.filter(row => row.kind === 'warranty');
  const paid = rows.filter(row => row.kind === 'client');
  const internal = rows.filter(row => row.kind === 'internal');
  const lateCount = dated.filter(row => row.isLate).length;
  return {
    count: rows.length, revenue: sum(rows, 'totalAmount'),
    paidRevenue: sum(paid, 'totalAmount'), warrantyAmount: sum(warranty, 'totalAmount'), internalAmount: sum(internal, 'totalAmount'),
    workAmount: sum(rows, 'workAmount'), partsAmount: sum(rows, 'partsAmount'), hours: sum(rows, 'hours'),
    averageCheck: average(rows, 'totalAmount'), warrantyCount: warranty.length, paidCount: paid.length, internalCount: internal.length,
    warrantyShare: percent(warranty.length, rows.length),
    lateCount, datedCount: dated.length, missingDatesCount: rows.length - dated.length,
    lateShareOfDated: percent(lateCount, dated.length), lateShareOfAll: percent(lateCount, rows.length),
    durationCount: rows.filter(row => typeof row.durationDays === 'number').length,
    averageDurationDays: average(rows, 'durationDays', 1),
    averageWarrantyDurationDays: average(warranty, 'durationDays', 1),
    uniqueVehicles: new Set(rows.map(row => row.vin).filter(Boolean)).size,
  };
}

function matches(row, filter) {
  const actual = row[filter.field];
  // Missing numeric values must never become zero in a numeric comparison.
  if (actual === null || actual === undefined) return false;
  if (filter.op === 'contains') return normalize(actual).includes(normalize(filter.value));
  if (filter.op === 'eq') {
    if (typeof actual === 'number') return Number.isFinite(Number(filter.value)) && actual === Number(filter.value);
    if (typeof actual === 'boolean') return String(actual) === filter.value.toLowerCase();
    return normalize(actual) === normalize(filter.value);
  }
  if (['saleDate', 'closeDate'].includes(filter.field)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filter.value)) throw new Error('Дата должна быть в формате ГГГГ-ММ-ДД.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(actual)) return false;
    return { gt: actual > filter.value, gte: actual >= filter.value, lt: actual < filter.value, lte: actual <= filter.value }[filter.op] ?? false;
  }
  const value = Number(filter.value);
  if (!Number.isFinite(value) || typeof actual !== 'number') throw new Error('Числовой фильтр требует числовое поле и значение.');
  return { gt: actual > value, gte: actual >= value, lt: actual < value, lte: actual <= value }[filter.op] ?? false;
}

export function queryAnalytics(args) {
  const { dataset, period = 'all', filters = [], groupBy = [], sortBy = 'count', direction = 'desc', limit = 10 } = args;
  if (!Object.hasOwn(fields, dataset) || !periods.includes(period)) throw new Error('Неизвестный набор данных или период.');
  if (!Array.isArray(filters) || filters.length > 12 || !Array.isArray(groupBy) || groupBy.length > 2) throw new Error('Слишком много условий или группировок.');
  for (const f of filters) {
    if (!fields[dataset].includes(f.field) || !['eq', 'contains', 'gt', 'gte', 'lt', 'lte'].includes(f.op) || typeof f.value !== 'string') throw new Error('Недопустимый фильтр.');
  }
  if (groupBy.some(field => !fields[dataset].includes(field))) throw new Error('Недопустимая группировка.');
  if (!['asc', 'desc'].includes(direction) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Недопустимая сортировка или лимит.');
  const all = dataset === 'sales' ? data.sales : data.serviceOrders;
  const rows = all.filter(row => (period === 'all' || row.month === period) && filters.every(filter => matches(row, filter)));
  const totals = summarize(dataset, rows);
  if (!Object.hasOwn(totals, sortBy)) throw new Error('Неизвестный показатель сортировки.');
  const grouped = new Map();
  if (groupBy.length) {
    for (const row of rows) {
      const key = JSON.stringify(groupBy.map(field => row[field]));
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }
  }
  const groups = [...grouped.values()].map(items => ({
    group: Object.fromEntries(groupBy.map(field => [field, items[0][field] ?? 'Не указано'])),
    ...summarize(dataset, items), share: percent(items.length, rows.length),
  })).sort((a, b) => {
    if (a[sortBy] === null) return b[sortBy] === null ? 0 : 1;
    if (b[sortBy] === null) return -1;
    return (direction === 'asc' ? 1 : -1) * (a[sortBy] - b[sortBy]) || JSON.stringify(a.group).localeCompare(JSON.stringify(b.group), 'ru');
  });
  return {
    dataset, period, filters, groupBy, sortBy, direction,
    source: sourcesFor(dataset === 'sales' ? 'sales' : 'service', period),
    totals, groups: groups.slice(0, limit), totalGroups: groups.length, truncated: groups.length > limit,
    methodology: dataset === 'sales'
      ? 'Одна строка — одна продажа. revenue — сумма salePrice (цена продажи без НДС); profit — суммарная маржа, не чистая прибыль. profitPercent = profit / revenue * 100. Нельзя суммировать проценты маржи. clientDisplay — отображаемое имя покупателя в отчёте, manager — сотрудник продаж. Совпадающие сокращённые имена покупателей могут объединять разных людей; такая группировка не доказывает уникальность человека.'
      : 'Одна строка — один заказ-наряд, а не уникальный автомобиль. kind: client — платный, warranty — гарантийный, internal — внутренний. Внутренние не входят в платные. Суммы гарантии и внутренних работ не равны оплатам клиентов. Сроки усредняются по известным durationDays (null исключены, 0 включён). Длительность и просрочка имеют разные знаменатели: datedCount — полный набор дат для оценки просрочки, durationCount — известная длительность. lateShareOfDated — доля просрочки среди заказов с полным набором дат; lateShareOfAll — среди всех. Денежные суммы в рублях, длительность в днях.',
  };
}

export function getOverview(period = 'all') {
  if (!periods.includes(period)) throw new Error('Неизвестный период.');
  const sales = data.sales.filter(row => period === 'all' || row.month === period);
  const orders = data.serviceOrders.filter(row => period === 'all' || row.month === period);
  const soldVins = new Set(sales.map(row => row.vin).filter(Boolean));
  const serviceVins = new Set(orders.map(row => row.vin).filter(Boolean));
  return {
    period, availablePeriod: data.period, sources: { sales: sourcesFor('sales', period), service: sourcesFor('service', period) },
    sales: summarize('sales', sales), service: summarize('service', orders),
    linkedVehicles: [...soldVins].filter(vin => serviceVins.has(vin)).length,
    linkageMethod: 'Пересечение уникальных непустых VIN продаж и сервиса в выбранном периоде. Наличие в сервисе не доказывает, что обращение было после продажи.',
    months: ['2026-05', '2026-06'].filter(month => period === 'all' || period === month).map(month => ({
      month, sales: summarize('sales', sales.filter(row => row.month === month)),
      service: summarize('service', orders.filter(row => row.month === month)),
    })),
    limitations: [
      'Это сохранённый снимок данных прототипа. Исходные Excel в данном архиве отсутствуют: повторно проверить распознавание по оригиналам нельзя.',
      'Нет данных о лидах, звонках, встречах и тест-драйвах. Конверсию воронки рассчитать нельзя.',
      'Частота сервисных обращений не является оценкой надёжности модели; нет размера парка и сопоставимого пробега.',
      'Нет данных о фактических оплатах, себестоимости сервиса и чистой прибыли. Сумма заказ-нарядов не равна денежному потоку.',
      'Причины изменений и прогнозы можно предложить только как гипотезы, отделяя их от наблюдаемых фактов.',
    ],
  };
}

export function getVehicleHistory({ search, period = 'all' }) {
  if (typeof search !== 'string' || normalize(search).length < 4 || !periods.includes(period)) throw new Error('Для поиска укажите минимум четыре символа VIN или номер заказ-наряда.');
  const needle = normalize(search);
  const vins = new Set([
    ...data.sales.filter(row => normalize(row.vin).includes(needle)),
    ...data.serviceOrders.filter(row => normalize(row.vin).includes(needle) || normalize(row.orderNumber).includes(needle)),
  ].map(row => row.vin).filter(Boolean));
  return {
    period, foundVehicles: vins.size, truncated: vins.size > 5,
    vehicles: [...vins].slice(0, 5).map(vin => ({
      vinMasked: `…${vin.slice(-4)}`,
      sales: data.sales.filter(row => row.vin === vin && (period === 'all' || row.month === period)).map(row => ({
        date: row.saleDate, model: row.model, dealer: row.dealer, manager: row.manager, price: row.salePrice,
      })),
      orders: data.serviceOrders.filter(row => row.vin === vin && (period === 'all' || row.month === period)).map(row => ({
        orderNumber: row.orderNumber, date: row.closeDate, model: row.model, kind: row.kind,
        totalAmount: row.totalAmount, durationDays: row.durationDays, isLate: row.hasRepairDates ? row.isLate : null,
      })),
    })),
    source: [...sourcesFor('sales', period), ...sourcesFor('service', period)],
  };
}

const functionTool = (name, description, properties) => ({
  type: 'function', name, description, strict: true,
  parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
});
const periodSchema = { type: 'string', enum: periods, description: 'all = май и июнь. Если месяц назван в вопросе, он важнее выбранного в интерфейсе периода.' };
export const analyticsTools = [
  functionTool('get_overview', 'Сводка продаж и сервиса, сравнение месяцев, пересечение VIN, ограничения данных.', { period: periodSchema }),
  functionTool('query_analytics', `Точные расчёты по всем строкам. Фильтры объединяются через И. Группировки до двух полей. Поля sales: ${fields.sales.join(', ')}. Поля service: ${fields.service.join(', ')}. Поиск модели через contains нечувствителен к регистру, пробелам и дефисам: i-Space находит Evolute i-Space. sortBy для sales: count, revenue, profit, profitPercent, averagePrice, negativeProfitCount, averageStockDays; service: count, revenue, paidRevenue, warrantyCount, paidCount, internalCount, lateCount, averageDurationDays, averageWarrantyDurationDays, lateShareOfDated. Для сумм всего набора используйте totals, а не сумму ограниченного списка groups. Для рейтинга менеджеров по прибыли sortBy=profit, по количеству sortBy=count.`, {
    dataset: { type: 'string', enum: ['sales', 'service'] }, period: periodSchema,
    filters: { type: 'array', items: { type: 'object', properties: {
      field: { type: 'string' }, op: { type: 'string', enum: ['eq', 'contains', 'gt', 'gte', 'lt', 'lte'] },
      value: { type: 'string', description: 'Значение строкой, включая числа и true/false. Для isWarranty и isUsed используйте eq и true/false.' },
    }, required: ['field', 'op', 'value'], additionalProperties: false } },
    groupBy: { type: 'array', items: { type: 'string' }, description: 'Например [month], [manager], [model], [month,model]; [] для общей суммы.' },
    sortBy: { type: 'string' }, direction: { type: 'string', enum: ['asc', 'desc'] },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  }),
  functionTool('get_vehicle_history', 'История по VIN (можно последние 4 символа) или номеру заказ-наряда. Возвращает все найденные обращения, не только последние восемь.', {
    search: { type: 'string' }, period: periodSchema,
  }),
];

export function executeTool(name, args) {
  switch (name) {
    case 'get_overview': return getOverview(args.period);
    case 'query_analytics': return queryAnalytics(args);
    case 'get_vehicle_history': return getVehicleHistory(args);
    default: throw new Error('Неизвестный инструмент.');
  }
}
