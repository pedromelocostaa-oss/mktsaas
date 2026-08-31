// Job de limpeza de mídia órfã (docs/03 e Fase 2 aceite).
// "Mídia órfã (upload sem post salvo) é limpa por job em 24h."
//
// Casos considerados órfãos:
// 1) PostMedia sem post associado (Post foi deletado hard). Cascade cobre isto no
//    schema, mas mantemos a lógica defensiva.
// 2) PostMedia em post que ficou apenas rascunho/IDEA por mais de 24h sem edições
//    e sem stage avançado — NÃO limpamos automaticamente. Ideia é conteúdo em
//    trabalho, não órfão.
// 3) Um caminho separado: uploads "confirmados" mas cujo post inteiro foi
//    arquivado há mais de 24h — mantemos, arquivar preserva histórico (docs/08 #15).
//
// O caso REAL que este job resolve: keys enviadas ao R2 cujo cliente nunca
// chamou confirmUpload. Essas nunca aparecem em PostMedia — a limpeza tem
// que rodar direto no R2 via ListObjects. Isso exige `@aws-sdk/client-s3`
// ListObjectsV2 e considerar o campo LastModified.

import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { db } from "@/server/db";

const CUTOFF_MS = 24 * 60 * 60 * 1000; // 24h

interface Result {
  scanned: number;
  deleted: number;
  errors: string[];
}

export async function limparOrfaos(): Promise<Result> {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return { scanned: 0, deleted: 0, errors: ["r2_not_configured"] };
  }
  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const cutoff = Date.now() - CUTOFF_MS;
  const referenciadas = new Set<string>();
  // carrega todas as keys referenciadas em PostMedia (uma vez).
  for await (const chunk of pagesOfMedia()) {
    for (const m of chunk) {
      referenciadas.add(m.storageKey);
      if (m.thumbnailKey) referenciadas.add(m.thumbnailKey);
    }
  }

  const paraApagar: string[] = [];
  let scanned = 0;
  let continuation: string | undefined = undefined;
  do {
    const res: import("@aws-sdk/client-s3").ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuation }),
    );
    for (const o of res.Contents ?? []) {
      if (!o.Key) continue;
      scanned++;
      const ageOk = o.LastModified && o.LastModified.getTime() < cutoff;
      if (!ageOk) continue;
      if (referenciadas.has(o.Key)) continue;
      paraApagar.push(o.Key);
    }
    continuation = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuation);

  const errors: string[] = [];
  // Deleta em lotes de 1000 (limite do DeleteObjects).
  for (let i = 0; i < paraApagar.length; i += 1000) {
    const lote = paraApagar.slice(i, i + 1000);
    try {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: lote.map((Key) => ({ Key })) },
        }),
      );
    } catch (e) {
      errors.push(String(e));
    }
  }

  return { scanned, deleted: paraApagar.length, errors };
}

async function* pagesOfMedia() {
  const take = 500;
  let skip = 0;
  for (;;) {
    const rows = await db.postMedia.findMany({
      select: { storageKey: true, thumbnailKey: true },
      take,
      skip,
    });
    if (rows.length === 0) return;
    yield rows;
    if (rows.length < take) return;
    skip += take;
  }
}
