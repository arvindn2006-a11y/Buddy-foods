import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';

export async function logAuditEvent(
  userId: number | null,
  action: string,
  entityType: string,
  entityId: string | null = null,
  details: any = null,
  ipAddress: string | null = null
): Promise<void> {
  const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, action, entityType, entityId, detailsStr, ipAddress]
      );
    } else {
      fallbackStore.audit_logs.push({
        id: fallbackStore.audit_logs.length + 1,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: detailsStr,
        ip_address: ipAddress,
        created_at: new Date()
      });
    }
  } catch (error) {
    console.warn('[Audit Log] Failed to write audit event:', error);
  }
}
