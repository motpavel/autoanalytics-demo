export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value || 0);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "RUB",
  }).format(value || 0);
}

export function formatMoneyShort(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 2)} млн ₽`;
  }
  return formatMoney(value);
}

export function formatPercent(value: number, digits = 0) {
  return `${formatNumber(value || 0, digits)}%`;
}

export function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU").format(date);
}

export function formatDays(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value, 1)} дн.`;
}

export function formatSignedPercent(value: number, digits = 0) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value, digits)}`;
}

export function pluralRu(value: number, one: string, few: string, many: string) {
  const mod10 = Math.abs(value) % 10;
  const mod100 = Math.abs(value) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Компактная сумма: значение и единица отдельно, чтобы KPI не переносился. */
export function moneyParts(value: number): { value: string; unit: string; divisor: number } {
  const abs = Math.abs(value);
  const [divisor, unit, digits] =
    abs >= 1_000_000_000 ? [1_000_000_000, "млрд ₽", 2] : abs >= 1_000_000 ? [1_000_000, "млн ₽", 1] : abs >= 1_000 ? [1_000, "тыс ₽", 0] : [1, "₽", 0];
  return { value: formatNumber(value / divisor, digits), unit, divisor };
}

/** Длительность ремонта: до суток — в часах, дальше — в днях. */
export function formatDuration(days: number | null | undefined) {
  if (days === null || days === undefined || !Number.isFinite(days)) return "—";
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} ч`;
  return `${formatNumber(days, 1)} дн.`;
}

export function plural(value: number, one: string, few: string, many: string) {
  return `${formatNumber(value)} ${pluralRu(value, one, few, many)}`;
}

export function repairTagClass(category: string) {
  if (category === "Гарантийный") return "tag tag--warranty";
  if (category === "Внутренний") return "tag tag--internal";
  return "tag tag--paid";
}
