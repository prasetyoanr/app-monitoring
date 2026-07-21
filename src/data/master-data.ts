import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import {
  masterCategories,
  masterDivisions,
  masterLocations,
} from "@/db/schema";

export interface MasterItemRecord {
  id: string;
  name: string;
}

export interface MasterDataRecords {
  divisions: MasterItemRecord[];
  locations: MasterItemRecord[];
  categories: MasterItemRecord[];
}

export async function getMasterDataRecords(): Promise<MasterDataRecords> {
  const [divisions, locations, categories] = await Promise.all([
    db
      .select({ id: masterDivisions.id, name: masterDivisions.name })
      .from(masterDivisions)
      .orderBy(asc(masterDivisions.name)),
    db
      .select({ id: masterLocations.id, name: masterLocations.name })
      .from(masterLocations)
      .orderBy(asc(masterLocations.name)),
    db
      .select({ id: masterCategories.id, name: masterCategories.name })
      .from(masterCategories)
      .orderBy(asc(masterCategories.name)),
  ]);
  return { divisions, locations, categories };
}

export async function getMasterOptions() {
  const [divisions, locations, categories] = await Promise.all([
    getDivisionOptions(),
    db
      .select({ name: masterLocations.name })
      .from(masterLocations)
      .orderBy(asc(masterLocations.name)),
    db
      .select({ name: masterCategories.name })
      .from(masterCategories)
      .orderBy(asc(masterCategories.name)),
  ]);
  return {
    divisions,
    locations: locations.map((item) => item.name),
    categories: categories.map((item) => item.name),
  };
}

export async function getDivisionOptions() {
  const divisions = await db
    .select({ name: masterDivisions.name })
    .from(masterDivisions)
    .orderBy(asc(masterDivisions.name));
  return divisions.map((item) => item.name);
}
