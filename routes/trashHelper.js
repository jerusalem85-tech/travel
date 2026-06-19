export async function moveToTrash(db, tableName, id, deletedBy) {
  try {
    const record = await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    if (record) {
      const { id: _, ...data } = record;
      await db.run(
        `INSERT INTO trash (entity_type, entity_id, entity_data, deleted_by) VALUES (?, ?, ?, ?)`,
        [tableName, id, JSON.stringify(data), deletedBy || null]
      );
    }
  } catch (err) {
    console.error('Trash save error:', err.message);
  }
}
