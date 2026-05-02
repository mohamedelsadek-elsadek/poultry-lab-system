import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { farmsTable, housesTable, cyclesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { GetFarmDashboardParams } from "@workspace/api-zod";
import { computeMetrics, formatCycle } from "./cycles";
import type { Cycle, Farm, House } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const farms = await db.select().from(farmsTable);
    const houses = await db.select().from(housesTable);
    const cycles = await db.select().from(cyclesTable);

    const completedCycles = cycles.filter((c) => c.status === "completed");
    const activeCycles = cycles.filter((c) => c.status === "active");

    let totalRevenueAllTime = 0;
    let totalProfitAllTime = 0;
    let totalFcr = 0;
    let fcrCount = 0;
    let totalMortalityRate = 0;
    let mortalityCount = 0;

    for (const cycle of completedCycles) {
      const metrics = computeMetrics(cycle);
      if (metrics.totalRevenue != null) totalRevenueAllTime += metrics.totalRevenue;
      if (metrics.netProfit != null) totalProfitAllTime += metrics.netProfit;
      if (metrics.fcr != null) { totalFcr += metrics.fcr; fcrCount++; }
      totalMortalityRate += metrics.mortalityRate;
      mortalityCount++;
    }

    const farmsPerf = await buildFarmsPerformance(farms, houses, cycles);
    const sortedByProfit = [...farmsPerf].sort((a, b) => b.totalProfit - a.totalProfit);

    res.json({
      totalFarms: farms.length,
      totalHouses: houses.length,
      activeCycles: activeCycles.length,
      completedCycles: completedCycles.length,
      totalChicksAllTime: cycles.reduce((s, c) => s + c.chickCount, 0),
      totalRevenueAllTime: Math.round(totalRevenueAllTime * 100) / 100,
      totalProfitAllTime: Math.round(totalProfitAllTime * 100) / 100,
      averageFcr: fcrCount > 0 ? Math.round((totalFcr / fcrCount) * 1000) / 1000 : 0,
      averageMortalityRate: mortalityCount > 0 ? Math.round((totalMortalityRate / mortalityCount) * 100) / 100 : 0,
      bestFarmName: sortedByProfit[0]?.farmNameAr ?? null,
      worstFarmName: sortedByProfit[sortedByProfit.length - 1]?.farmNameAr ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching company summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function buildFarmsPerformance(
  farms: Farm[],
  houses: House[],
  allCycles: Cycle[],
) {
  const farmsData = farms;
  const housesData = houses;
  const cyclesData = allCycles;

  return farmsData.map((farm, idx) => {
    const farmHouseIds = housesData.filter((h) => h.farmId === farm.id).map((h) => h.id);
    const farmCycles = cyclesData.filter((c) => farmHouseIds.includes(c.houseId));
    const completedFarmCycles = farmCycles.filter((c) => c.status === "completed");

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalFcr = 0;
    let fcrCount = 0;
    let totalMortalityRate = 0;

    for (const cycle of completedFarmCycles) {
      const metrics = computeMetrics(cycle);
      if (metrics.totalRevenue != null) totalRevenue += metrics.totalRevenue;
      if (metrics.netProfit != null) totalProfit += metrics.netProfit;
      if (metrics.fcr != null) { totalFcr += metrics.fcr; fcrCount++; }
      totalMortalityRate += metrics.mortalityRate;
    }

    const profitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      farmId: farm.id,
      farmName: farm.name,
      farmNameAr: farm.nameAr,
      totalCycles: farmCycles.length,
      totalChicks: farmCycles.reduce((s, c) => s + c.chickCount, 0),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      averageFcr: fcrCount > 0 ? Math.round((totalFcr / fcrCount) * 1000) / 1000 : 0,
      averageMortalityRate: completedFarmCycles.length > 0
        ? Math.round((totalMortalityRate / completedFarmCycles.length) * 100) / 100
        : 0,
      profitMarginPercent: Math.round(profitMarginPercent * 100) / 100,
      rank: idx + 1,
    };
  });
}

router.get("/dashboard/farms-performance", async (req, res) => {
  try {
    const farms = await db.select().from(farmsTable);
    const houses = await db.select().from(housesTable);
    const cycles = await db.select().from(cyclesTable);

    const result = await buildFarmsPerformance(farms, houses, cycles);
    const sorted = result.sort((a, b) => b.totalProfit - a.totalProfit).map((f, i) => ({ ...f, rank: i + 1 }));

    res.json(sorted);
  } catch (err) {
    req.log.error({ err }, "Error fetching farms performance");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/farms/:farmId/dashboard", async (req, res) => {
  try {
    const { farmId } = GetFarmDashboardParams.parse(req.params);

    const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.id, farmId));
    if (!farm) {
      res.status(404).json({ error: "Farm not found" });
      return;
    }

    const houses = await db.select().from(housesTable).where(eq(housesTable.farmId, farmId)).orderBy(housesTable.id);
    const houseIds = houses.map((h) => h.id);

    let allCycles: Cycle[] = [];
    for (const hid of houseIds) {
      const hcycles = await db.select().from(cyclesTable).where(eq(cyclesTable.houseId, hid)).orderBy(cyclesTable.cycleNumber);
      allCycles = allCycles.concat(hcycles);
    }

    const formattedCycles = allCycles.map(formatCycle);
    const completedFormatted = formattedCycles.filter((c) => c.status === "completed");

    let bestCycle = null;
    let worstCycle = null;
    if (completedFormatted.length > 0) {
      const withProfit = completedFormatted.filter((c) => c.netProfit != null);
      if (withProfit.length > 0) {
        bestCycle = withProfit.reduce((a, b) => (a.netProfit! > b.netProfit! ? a : b));
        worstCycle = withProfit.reduce((a, b) => (a.netProfit! < b.netProfit! ? a : b));
      }
    }

    let totalProfit = 0;
    let totalFcr = 0;
    let fcrCount = 0;
    let totalMortality = 0;

    for (const c of completedFormatted) {
      if (c.netProfit != null) totalProfit += c.netProfit;
      if (c.fcr != null) { totalFcr += c.fcr; fcrCount++; }
      totalMortality += c.mortalityRate ?? 0;
    }

    const houseComparison = await Promise.all(
      houses.map(async (house) => {
        const hcycles = allCycles.filter((c) => c.houseId === house.id);
        const completedHcycles = hcycles.filter((c) => c.status === "completed").map(formatCycle);

        let hp = 0; let hf = 0; let hfc = 0; let hm = 0;
        for (const c of completedHcycles) {
          if (c.netProfit != null) hp += c.netProfit;
          if (c.fcr != null) { hf += c.fcr; hfc++; }
          hm += c.mortalityRate ?? 0;
        }

        const cycleCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(cyclesTable)
          .where(eq(cyclesTable.houseId, house.id));

        return {
          houseId: house.id,
          houseName: house.name,
          houseNameAr: house.nameAr,
          cycleCount: Number(cycleCountResult[0]?.count ?? 0),
          totalProfit: Math.round(hp * 100) / 100,
          averageFcr: hfc > 0 ? Math.round((hf / hfc) * 1000) / 1000 : 0,
          averageMortalityRate: completedHcycles.length > 0
            ? Math.round((hm / completedHcycles.length) * 100) / 100
            : 0,
        };
      }),
    );

    const housesWithCount = await Promise.all(
      houses.map(async (house) => {
        const ccResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(cyclesTable)
          .where(eq(cyclesTable.houseId, house.id));
        return { ...house, cycleCount: Number(ccResult[0]?.count ?? 0) };
      }),
    );

    const farmHouseIds = houses.map((h) => h.id);
    const farmActiveCycles = allCycles.filter((c) => c.status === "active");
    const farmTotalChicks = allCycles.reduce((s, c) => s + c.chickCount, 0);

    res.json({
      farm: {
        id: farm.id,
        name: farm.name,
        nameAr: farm.nameAr,
        houseCount: houses.length,
        activeCycles: farmActiveCycles.length,
        totalChicks: farmTotalChicks,
      },
      houses: housesWithCount.map((h) => ({
        id: h.id,
        farmId: h.farmId,
        name: h.name,
        nameAr: h.nameAr,
        areaM2: h.areaM2,
        cycleCount: h.cycleCount,
      })),
      cycles: formattedCycles,
      bestCycle,
      worstCycle,
      totalProfit: Math.round(totalProfit * 100) / 100,
      averageFcr: fcrCount > 0 ? Math.round((totalFcr / fcrCount) * 1000) / 1000 : 0,
      averageMortalityRate: completedFormatted.length > 0
        ? Math.round((totalMortality / completedFormatted.length) * 100) / 100
        : 0,
      houseComparison,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching farm dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/best-cycles", async (req, res) => {
  try {
    const allCycles = await db.select().from(cyclesTable);
    const allHouses = await db.select().from(housesTable);
    const allFarms = await db.select().from(farmsTable);

    const completed = allCycles.filter((c) => c.status === "completed");
    const formatted = completed.map((c) => {
      const house = allHouses.find((h) => h.id === c.houseId);
      const farm = house ? allFarms.find((f) => f.id === house.farmId) : null;
      return {
        cycle: formatCycle(c),
        farmName: farm?.name ?? "",
        farmNameAr: farm?.nameAr ?? "",
        houseName: house?.name ?? "",
        houseNameAr: house?.nameAr ?? "",
      };
    });

    const sorted = formatted
      .filter((x) => x.cycle.netProfit != null)
      .sort((a, b) => (b.cycle.netProfit ?? 0) - (a.cycle.netProfit ?? 0))
      .slice(0, 10);

    res.json(sorted);
  } catch (err) {
    req.log.error({ err }, "Error fetching best cycles");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
