import { useEffect, useState } from "react";
import {
  loadJunctionKpis,
  loadJunctions,
  loadKpi,
  loadSignals,
} from "../lib/data.js";

// Reference datasets: junctions, network KPI, per-junction KPI (once)
// plus per-algorithm signal green splits.
export function useReplayData(algo, onError) {
  const [junctions, setJunctions] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [junctionKpis, setJunctionKpis] = useState({});
  const [signals, setSignals] = useState({});

  useEffect(() => {
    loadJunctions().then(setJunctions).catch(() => onError("Không tải được junctions.json"));
    loadKpi().then(setKpi).catch(() => onError("Không tải được kpi_summary.json"));
    loadJunctionKpis().then(setJunctionKpis).catch(() => {});
  }, [onError]);

  useEffect(() => {
    loadSignals(algo)
      .then(setSignals)
      .catch(() => {
        // Keep the CAO schedule instead of wiping to {} so the 32
        // poles never vanish when baseline signal data is missing.
        if (algo !== "cao") {
          loadSignals("cao").then(setSignals).catch(() => {});
          onError("Chưa có dữ liệu đèn cho baseline — đang hiển thị theo CAO");
        }
      });
  }, [algo, onError]);

  return { junctions, kpi, junctionKpis, signals };
}
