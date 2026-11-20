export type TabId = "overview" | "sales" | "service" | "team" | "clients" | "ai";

export type NamedMetric = {
  name: string;
  count: number;
  amount: number;
  share: number;
};

export type MonthMetric = {
  month: string;
  label: string;
  count: number;
  amount?: number;
  warranty?: number;
  commercial?: number;
};

export type Metrics = {
  totalSalesCount: number;
  maySalesCount: number;
  juneSalesCount: number;
  totalSalesAmount: number;
  averageSalePrice: number;
  serviceOrdersCount: number;
  mayServiceOrdersCount: number;
  juneServiceOrdersCount: number;
  warrantyOrdersCount: number;
  commercialOrdersCount: number;
  warrantyShare: number;
  commercialShare: number;
  lateOrdersCount: number;
  lateOrdersShare: number;
  vinOverlapCount: number;
  averageRepairDays: number;
  averageWarrantyRepairDays: number;
  totalMargin: number;
  averageMarginPercent: number;
  usedSalesCount: number;
  internalOrdersCount: number;
  carMargin: number;
  salesWithoutVinCount: number;
  ordersWithoutDatesCount: number;
};

export type SaleRecord = {
  id: string;
  dealer: string;
  manager: string;
  model: string;
  vin: string;
  vinMasked: string;
  clientDisplay: string;
  saleDate: string;
  month: string;
  salePrice: number;
  margin: number;
  marginPercent: number;
  isUsed: boolean;
  rrp: number;
  discount: number;
  importerCompensation: number;
  carMargin: number;
  accessoriesRevenue: number;
  accessoriesMargin: number;
  financeMargin: number;
  bonus: number;
  hasInsurance: boolean;
  hasCredit: boolean;
  isTradeIn: boolean;
  stockDays: number;
};

export type ServiceOrder = {
  id: string;
  orderNumber: string;
  brand: string;
  model: string;
  vin: string;
  vinMasked: string;
  repairType: string;
  repairCategory: "Гарантийный" | "Платный" | "Внутренний";
  isWarranty: boolean;
  kind: "client" | "warranty" | "internal";
  master: string;
  workAmount: number;
  partsAmount: number;
  hours: number;
  mileage: number;
  startWeekday: number | null;
  startHour: number | null;
  closeDate: string;
  month: string;
  totalAmount: number;
  durationDays: number | null;
  isLate: boolean;
  hasRepairDates: boolean;
};

export type VehicleHistoryItem = {
  orderNumber: string;
  closeDate: string;
  repairType: string;
  repairCategory: "Гарантийный" | "Платный" | "Внутренний";
  totalAmount: number;
  durationDays: number | null;
  isLate: boolean;
  reason: string;
  master: string;
  mileage: number;
  workAmount: number;
  partsAmount: number;
  hours: number;
};

export type VehicleCard = {
  vin: string;
  vinMasked: string;
  model: string;
  brand: string;
  customerDisplay: string;
  linkedToSale: boolean;
  sale: null | {
    date: string;
    dealer: string;
    manager: string;
    price: number;
  };
  serviceCount: number;
  warrantyCount: number;
  commercialCount: number;
  paidRepairAmount: number;
  lastVisit: string;
  serviceHistory: VehicleHistoryItem[];
};

export type ClientCard = {
  name: string;
  vehiclesCount: number;
  serviceOrdersCount: number;
  warrantyOrdersCount: number;
  commercialOrdersCount: number;
  paidRepairAmount: number;
  vins: string[];
};

export type Insight = {
  type: "risk" | "warning" | "success" | "info";
  title: string;
  text: string;
  tab: TabId;
};

export type DemoData = {
  generatedAt: string;
  sources: {
    sales: string[];
    service: string[];
  };
  period: {
    from: string;
    to: string;
    label: string;
  };
  metrics: Metrics;
  salesByMonth: MonthMetric[];
  cumulativeSalesByMonth: MonthMetric[];
  salesAmountByMonth: Array<{ month: string; label: string; amount: number }>;
  salesByDealer: NamedMetric[];
  salesByManager: NamedMetric[];
  salesByModel: NamedMetric[];
  serviceByMonth: MonthMetric[];
  serviceByModel: NamedMetric[];
  warrantyByModel: NamedMetric[];
  lateOrdersByModel: NamedMetric[];
  latestSales: SaleRecord[];
  latestServiceOrders: ServiceOrder[];
  sales: SaleRecord[];
  serviceOrders: ServiceOrder[];
  vehicleCards: VehicleCard[];
  clientCards: ClientCard[];
  warnings: string[];
};

export type AssistantAnswer = {
  kind: "answer" | "clarification";
  result: string;
  mode: "api" | "mock";
  model: string | null;
};
