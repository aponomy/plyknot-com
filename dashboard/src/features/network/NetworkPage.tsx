import { useSearchParams } from "react-router-dom";
import { SUB_TABS, type SubTab } from "./shared";
import { OverviewView } from "./OverviewView";
import { OpCosView } from "./OpCosView";
import { MarketsView } from "./MarketsView";
import { OrganizationView } from "./OrganizationView";
import { ResearchersView } from "./ResearchersView";
import { BridgesView } from "./BridgesView";

const TAB_PARAM_MAP: Record<string, SubTab> = {
  overview: "Overview", opcos: "OpCos", markets: "Markets",
  organization: "Organization", researchers: "Researchers", bridges: "Bridges",
};
const TAB_KEY_MAP: Record<SubTab, string> = Object.fromEntries(
  Object.entries(TAB_PARAM_MAP).map(([k, v]) => [v, k])
) as Record<SubTab, string>;

export function NetworkPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") || "overview";
  const activeTab: SubTab = TAB_PARAM_MAP[tabParam] || "Overview";

  const setTab = (t: SubTab) => {
    setParams({ tab: TAB_KEY_MAP[t] });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Network</h1>
        <div style={{ display: "flex", gap: 4 }}>
          {SUB_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "5px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                border: activeTab === t ? "1px solid var(--foreground)" : "1px solid var(--border)",
                background: activeTab === t ? "var(--foreground)" : "transparent",
                color: activeTab === t ? "var(--background)" : "var(--foreground)",
                fontWeight: activeTab === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, padding: "16px 20px", overflow: "hidden" }}>
        {activeTab === "Overview" && <OverviewView />}
        {activeTab === "OpCos" && <OpCosView />}
        {activeTab === "Markets" && <MarketsView />}
        {activeTab === "Organization" && <OrganizationView />}
        {activeTab === "Researchers" && <ResearchersView />}
        {activeTab === "Bridges" && <BridgesView />}
      </div>
    </div>
  );
}
