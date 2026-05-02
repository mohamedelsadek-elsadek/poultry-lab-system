import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const farmsTable = pgTable("farms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const housesTable = pgTable("houses", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  areaM2: real("area_m2").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cyclesTable = pgTable("cycles", {
  id: serial("id").primaryKey(),
  houseId: integer("house_id").notNull().references(() => housesTable.id, { onDelete: "cascade" }),
  cycleNumber: integer("cycle_number").notNull(),
  housingDate: text("housing_date").notNull(),
  chickCount: integer("chick_count").notNull(),
  chickPricePerUnit: real("chick_price_per_unit").notNull(),
  breed: text("breed").notNull().default("Ross"),
  totalFeedKg: real("total_feed_kg"),
  feedCostTotal: real("feed_cost_total"),
  totalMedicationCost: real("total_medication_cost"),
  totalMortality: integer("total_mortality"),
  finalWeightKg: real("final_weight_kg"),
  saleAgeDays: integer("sale_age_days"),
  salePricePerKg: real("sale_price_per_kg"),
  otherCosts: real("other_costs"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mortalityLogsTable = pgTable("mortality_logs", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull().references(() => cyclesTable.id, { onDelete: "cascade" }),
  logDate: text("log_date").notNull(),
  count: integer("count").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMortalityLogSchema = createInsertSchema(mortalityLogsTable).omit({ id: true, createdAt: true });
export type MortalityLog = typeof mortalityLogsTable.$inferSelect;
export type InsertMortalityLog = z.infer<typeof insertMortalityLogSchema>;

export const insertFarmSchema = createInsertSchema(farmsTable).omit({ id: true, createdAt: true });
export const insertHouseSchema = createInsertSchema(housesTable).omit({ id: true, createdAt: true });
export const insertCycleSchema = createInsertSchema(cyclesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Farm = typeof farmsTable.$inferSelect;
export type House = typeof housesTable.$inferSelect;
export type Cycle = typeof cyclesTable.$inferSelect;
export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type InsertHouse = z.infer<typeof insertHouseSchema>;
export type InsertCycle = z.infer<typeof insertCycleSchema>;
