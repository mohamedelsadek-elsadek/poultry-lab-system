import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { housesTable, cyclesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetHousePerformanceReportParams } from "@workspace/api-zod";
import { computeMetrics } from "./cycles";
import type { Cycle } from "@workspace/db";

const router: IRouter = Router();

type TrendIndicator = "improving" | "neutral" | "declining" | "insufficient_data";

function trend(
  current: number | null | undefined,
  historical: number | null | undefined,
  lowerIsBetter: boolean,
): TrendIndicator {
  if (current == null || historical == null || historical === 0) return "insufficient_data";
  const pct = (current - historical) / historical;
  if (Math.abs(pct) < 0.03) return "neutral";
  if (lowerIsBetter) return pct < 0 ? "improving" : "declining";
  return pct > 0 ? "improving" : "declining";
}

router.get("/houses/:houseId/performance-report", async (req, res) => {
  try {
    const { houseId } = GetHousePerformanceReportParams.parse(req.params);

    const [house] = await db.select().from(housesTable).where(eq(housesTable.id, houseId));
    if (!house) {
      res.status(404).json({ error: "House not found" });
      return;
    }

    const allCycles = await db
      .select()
      .from(cyclesTable)
      .where(eq(cyclesTable.houseId, houseId))
      .orderBy(cyclesTable.cycleNumber);

    const completedCycles = allCycles.filter((c) => c.status === "completed");
    const activeCycle = allCycles.find((c) => c.status === "active") ?? null;

    // Build cycle history entries
    const cycleHistory = allCycles.map((c: Cycle) => {
      const m = computeMetrics(c);
      return {
        cycleNumber: c.cycleNumber,
        housingDate: c.housingDate,
        fcr: m.fcr ?? undefined,
        mortalityRate: m.mortalityRate,
        netProfit: m.netProfit ?? undefined,
        costPerLiveKg: m.costPerLiveKg ?? undefined,
        status: c.status,
      };
    });

    // Historical averages from completed cycles
    let sumFcr = 0; let fcrCount = 0;
    let sumMortality = 0;
    let sumProfit = 0; let profitCount = 0;
    let sumCostPerKg = 0; let costCount = 0;
    let sumChicks = 0;
    let sumDays = 0; let daysCount = 0;

    for (const c of completedCycles) {
      const m = computeMetrics(c);
      if (m.fcr != null) { sumFcr += m.fcr; fcrCount++; }
      sumMortality += m.mortalityRate;
      if (m.netProfit != null) { sumProfit += m.netProfit; profitCount++; }
      if (m.costPerLiveKg != null) { sumCostPerKg += m.costPerLiveKg; costCount++; }
      sumChicks += c.chickCount;
      if (c.saleAgeDays != null) { sumDays += c.saleAgeDays; daysCount++; }
    }

    const n = completedCycles.length;
    const historicalAvg = {
      cycleCount: n,
      avgFcr: fcrCount > 0 ? Math.round((sumFcr / fcrCount) * 1000) / 1000 : 0,
      avgMortalityRate: n > 0 ? Math.round((sumMortality / n) * 100) / 100 : 0,
      avgNetProfit: profitCount > 0 ? Math.round((sumProfit / profitCount) * 100) / 100 : 0,
      avgCostPerLiveKg: costCount > 0 ? Math.round((sumCostPerKg / costCount) * 100) / 100 : 0,
      avgChickCount: n > 0 ? Math.round(sumChicks / n) : 0,
      avgDaysToSale: daysCount > 0 ? Math.round(sumDays / daysCount) : 0,
    };

    // Build active cycle snapshot
    let activeCycleSnapshot = null;
    if (activeCycle) {
      const today = new Date();
      const housing = new Date(activeCycle.housingDate);
      const daysElapsed = Math.floor((today.getTime() - housing.getTime()) / (1000 * 60 * 60 * 24));

      const survived = activeCycle.chickCount - (activeCycle.totalMortality ?? 0);
      const mortalityRate = activeCycle.chickCount > 0
        ? ((activeCycle.totalMortality ?? 0) / activeCycle.chickCount) * 100
        : 0;

      const estimatedFcr =
        survived > 0 && activeCycle.totalFeedKg != null && activeCycle.finalWeightKg != null && activeCycle.finalWeightKg > 0
          ? activeCycle.totalFeedKg / activeCycle.finalWeightKg
          : activeCycle.totalFeedKg != null && survived > 0 && daysElapsed > 0
            ? null
            : null;

      const chickCost = activeCycle.chickCount * activeCycle.chickPricePerUnit;
      const feedCost = activeCycle.feedCostTotal ?? 0;
      const medCost = activeCycle.totalMedicationCost ?? 0;
      const other = activeCycle.otherCosts ?? 0;
      const totalCostSoFar = chickCost + feedCost + medCost + other;

      const costPerLiveKgSoFar =
        activeCycle.finalWeightKg != null && activeCycle.finalWeightKg > 0
          ? totalCostSoFar / activeCycle.finalWeightKg
          : activeCycle.totalFeedKg != null && survived > 0
            ? totalCostSoFar / (survived * historicalAvg.avgCostPerLiveKg > 0 ? 1 : 1)
            : null;

      activeCycleSnapshot = {
        cycleId: activeCycle.id,
        cycleNumber: activeCycle.cycleNumber,
        housingDate: activeCycle.housingDate,
        daysElapsed,
        chickCount: activeCycle.chickCount,
        currentMortality: activeCycle.totalMortality ?? 0,
        mortalityRate: Math.round(mortalityRate * 100) / 100,
        totalFeedKg: activeCycle.totalFeedKg ?? undefined,
        feedCostSoFar: feedCost > 0 ? feedCost : undefined,
        estimatedFcr: estimatedFcr != null ? Math.round(estimatedFcr * 1000) / 1000 : undefined,
        totalCostSoFar: Math.round(totalCostSoFar * 100) / 100,
        costPerLiveKgSoFar: costPerLiveKgSoFar != null ? Math.round(costPerLiveKgSoFar * 100) / 100 : undefined,
        status: activeCycle.status,
      };
    }

    // Trends: compare active cycle vs historical
    const activeFcr = activeCycleSnapshot?.estimatedFcr ?? null;
    const activeMortality = activeCycleSnapshot?.mortalityRate ?? null;
    const activeCostPerKg = activeCycleSnapshot?.costPerLiveKgSoFar ?? null;

    const trends = {
      fcr: trend(activeFcr, historicalAvg.avgFcr, true),
      mortalityRate: trend(activeMortality, historicalAvg.avgMortalityRate, true),
      costPerLiveKg: trend(activeCostPerKg, historicalAvg.avgCostPerLiveKg, true),
    };

    res.json({
      houseId: house.id,
      houseName: house.name,
      houseNameAr: house.nameAr,
      activeCycle: activeCycleSnapshot,
      historicalAvg,
      trends,
      cycleHistory,
    });
  } catch (err) {
    req.log.error({ err }, "Error generating performance report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
