export function extractTables(sql: string): string[] {
  // Heurística simples: busca por FROM, JOIN, UPDATE, INTO
  const lower = sql.toLowerCase();
  const tokens: string[] = [];
  const patterns = [/\bfrom\s+([a-z0-9_\.]+)/g, /\bjoin\s+([a-z0-9_\.]+)/g, /\bupdate\s+([a-z0-9_\.]+)/g, /\binto\s+([a-z0-9_\.]+)/g];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      tokens.push(m[1].replace(/[^a-z0-9_\.]/g, ''));
    }
  }
  return Array.from(new Set(tokens));
}
