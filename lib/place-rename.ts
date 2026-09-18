import type { Client } from "@libsql/client";

/** Keep place ids so attendance, questions, and duties stay linked. */
export async function renameAmbashiToShindi(db: Client): Promise<void> {
  const shindi = await db.execute({
    sql: "SELECT id FROM places WHERE name = ? LIMIT 1",
    args: ["शिंदी"],
  });
  if (!shindi.rows[0]) {
    await db.execute({
      sql: "UPDATE places SET name = ? WHERE name = ?",
      args: ["शिंदी", "अंबाशी"],
    });
  }
  await db.execute({
    sql: "UPDATE members SET place_code = ? WHERE place_code = ?",
    args: ["shindi", "ambashi"],
  });
}
