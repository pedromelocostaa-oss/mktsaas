// Rate-limit em memória. Suficiente para uma instância; troque por Redis
// quando escalar horizontalmente (docs/03 tabela de limites).

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Retorna true se DENTRO do limite, false se excedido. */
export function permitir(key: string, limite: number, janelaMs: number): boolean {
  const agora = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < agora) {
    buckets.set(key, { count: 1, resetAt: agora + janelaMs });
    return true;
  }
  if (b.count >= limite) return false;
  b.count += 1;
  return true;
}
