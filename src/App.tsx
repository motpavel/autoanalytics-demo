import { useMemo, useState } from "react";
import rawData from "./data/demo-data.json";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { AiAnalysisPage } from "./pages/AiAnalysisPage";
import { ClientsPage } from "./pages/ClientsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SalesPage } from "./pages/SalesPage";
import { ServicePage } from "./pages/ServicePage";
import { TeamPage } from "./pages/TeamPage";
import { FloatingAssistant } from "./components/FloatingAssistant";
import type { DemoData, TabId } from "./lib/types";
import { buildView, type PeriodId } from "./lib/view";
import { AssistantProvider } from "./lib/assistant-store";

const data = rawData as unknown as DemoData;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [period, setPeriod] = useState<PeriodId>("all");
  const view = useMemo(() => buildView(data, period), [period]);

  function openTab(tab: TabId) {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  }

  return (
    <AssistantProvider><div className="app">
      <Sidebar activeTab={activeTab} data={data} onTabChange={openTab} />
      <main className="main">
        <Topbar activeTab={activeTab} period={period} onPeriodChange={setPeriod} />
        <div className="page" key={activeTab}>
          {activeTab === "overview" ? <OverviewPage data={data} view={view} onOpenTab={openTab} /> : null}
          {activeTab === "sales" ? <SalesPage data={data} period={period} /> : null}
          {activeTab === "service" ? <ServicePage view={view} /> : null}
          {activeTab === "team" ? <TeamPage view={view} /> : null}
          {activeTab === "clients" ? <ClientsPage data={data} /> : null}
          {activeTab === "ai" ? <AiAnalysisPage data={data} /> : null}
        </div>
      </main>
      {activeTab !== "ai" ? <FloatingAssistant period={period} /> : null}
    </div></AssistantProvider>
  );
}
