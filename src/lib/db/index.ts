import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";
import { validateEnv } from "../env";

validateEnv();

export const db = drizzle(sql, { schema });
export { schema };
