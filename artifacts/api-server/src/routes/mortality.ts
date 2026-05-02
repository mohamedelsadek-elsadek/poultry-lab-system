import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { mortalityLogsTable, cyclesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListMortalityLogsParams,
  AddMortalityLogParams,
  AddMortalityLogBody,
  DeleteMortalityLogParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cycles/:cycleId/mortality", async (req, res) => {
  try {
    const { cycleId } = ListMortalityLogsParams.parse(req.params);
    const logs = await db
      .select()
      .from(mortalityLogsTable)
      .where(eq(mortalityLogsTable.cycleId, cycleId))
      .orderBy(mortalityLogsTable.logDate);

    res.json(
      logs.map((l) => ({
        id: l.id,
        cycleId: l.cycleId,
        logDate: l.logDate,
        count: l.count,
        notes: l.notes ?? undefined,
        createdAt: l.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching mortality logs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cycles/:cycleId/mortality", async (req, res) => {
  try {
    const { cycleId } = AddMortalityLogParams.parse(req.params);
    const body = AddMortalityLogBody.parse(req.body);

    const [cycle] = await db
      .select()
      .from(cyclesTable)
      .where(eq(cyclesTable.id, cycleId));

    if (!cycle) {
      res.status(404).json({ error: "Cycle not found" });
      return;
    }

    const logDate =
      body.logDate instanceof Date
        ? body.logDate.toISOString().split("T")[0]
        : String(body.logDate);

    const [log] = await db
      .insert(mortalityLogsTable)
      .values({ cycleId, logDate, count: body.count, notes: body.notes ?? null })
      .returning();

    res.status(201).json({
      id: log.id,
      cycleId: log.cycleId,
      logDate: log.logDate,
      count: log.count,
      notes: log.notes ?? undefined,
      createdAt: log.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error adding mortality log");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cycles/:cycleId/mortality/:logId", async (req, res) => {
  try {
    const { cycleId, logId } = DeleteMortalityLogParams.parse(req.params);
    await db
      .delete(mortalityLogsTable)
      .where(
        and(
          eq(mortalityLogsTable.id, logId),
          eq(mortalityLogsTable.cycleId, cycleId),
        ),
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting mortality log");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
