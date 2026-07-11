import { AuditEntry } from "./types";

// Deterministic, dependency-free string hash (cyrb53). This gives the audit
// trail tamper-EVIDENCE — editing, reordering, or deleting a past entry in
// localStorage breaks the chain from that point forward, and Verify Integrity
// (see verifyAuditChain) will flag it. It is NOT tamper-PROOF: since this app
// has no backend, anyone with devtools access can recompute the chain the
// same way this function does and forge a consistent one. Real immutability
// needs a server that the client can't rewrite history on; this is a UX
// preview of that guarantee, not a substitute for it.
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(16).padStart(14, "0");
}

type EntryContent = Pick<AuditEntry, "timestamp" | "user" | "action" | "entity" | "entityId" | "details">;

export function hashAuditEntry(prevHash: string, entry: EntryContent): string {
  const payload = `${prevHash}|${entry.timestamp}|${entry.user}|${entry.action}|${entry.entity}|${entry.entityId}|${entry.details}`;
  return cyrb53(payload);
}

// Seed data (and any bulk import) arrives newest-first, matching how logAudit
// prepends new entries. The chain itself has to be computed oldest-to-newest
// (each entry's hash depends on the one before it), so this reverses,
// chains, then reverses back to the array's normal display order.
export function buildHashChain(entries: Omit<AuditEntry, "hash" | "prevHash">[]): AuditEntry[] {
  const chronological = [...entries].reverse();
  let prevHash = "";
  const chained: AuditEntry[] = [];
  for (const entry of chronological) {
    const hash = hashAuditEntry(prevHash, entry);
    chained.push({ ...entry, prevHash, hash });
    prevHash = hash;
  }
  return chained.reverse();
}

export interface AuditIntegrityResult {
  intact: boolean;
  brokenAtId?: string;
  checkedCount: number;
}

export function verifyAuditChain(auditLog: AuditEntry[]): AuditIntegrityResult {
  const chronological = [...auditLog].reverse();
  let prevHash = "";
  for (const entry of chronological) {
    const recomputed = hashAuditEntry(prevHash, entry);
    if (entry.prevHash !== prevHash || entry.hash !== recomputed) {
      return { intact: false, brokenAtId: entry.id, checkedCount: chronological.length };
    }
    prevHash = entry.hash;
  }
  return { intact: true, checkedCount: chronological.length };
}
