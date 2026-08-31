"use client";

// Painel de mídia (Fase 2). Fica dentro do drawer do post.
// - Upload direto para R2 por URL assinada — não passa pelo servidor.
// - Thumbnails: preview local imediato via URL.createObjectURL enquanto sobe;
//   depois, para vídeo, gera 1º frame via <video>+canvas e sobe como thumbnailKey.
// - Avisa (não bloqueia) quando algum arquivo desrespeita regras da rede alvo.
// - Reordenação por setinhas ↑ ↓. Alt text opcional.
// - "Mídia órfã (upload sem post salvo)" é limpa pelo job (docs/03 media-cleanup).

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Btn } from "@/components/ui/btn";
import { validarMedia, type MediaWarning } from "@/lib/network-rules";
import type { Network } from "@prisma/client";
import {
  confirmUpload,
  listarMedia,
  removeMedia,
  reorderMedia,
  requestUpload,
  setAltText,
  setThumbnailKey,
} from "@/server/services/media";

interface MediaItem {
  id: string;
  kind: "IMAGE" | "VIDEO";
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  altText: string | null;
  position: number;
  url: string;
  thumbnailUrl: string | null;
}

interface PendingItem {
  tempId: string;
  file: File;
  localUrl: string;
  progresso: number; // 0..100
  erro?: string;
}

export function MediaPanel({ postId, networks }: { postId: string; networks: Network[] }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [itens, setItens] = useState<MediaItem[]>([]);
  const [pendentes, setPendentes] = useState<PendingItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const r = await listarMedia(postId);
      if (r.ok) setItens(r.media);
      setCarregando(false);
    })();
  }, [postId]);

  async function processarArquivo(file: File) {
    const kind: "IMAGE" | "VIDEO" = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
    const tempId = Math.random().toString(36).slice(2);
    const localUrl = URL.createObjectURL(file);
    setPendentes((p) => [...p, { tempId, file, localUrl, progresso: 0 }]);

    // Lê dimensões / duração
    const meta = await lerMeta(file, kind);

    // 1) pede URL assinada
    const req = await requestUpload({
      postId,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes: file.size,
      kind,
    });
    if (!req.ok) {
      setPendentes((p) => p.map((x) => (x.tempId === tempId ? { ...x, erro: req.error } : x)));
      toast.push({ text: req.error });
      return;
    }

    // 2) PUT direto no R2 (não passa pelo Node)
    try {
      await putComProgresso(req.url, file, (pct) =>
        setPendentes((p) => p.map((x) => (x.tempId === tempId ? { ...x, progresso: pct } : x))),
      );
    } catch (e) {
      setPendentes((p) => p.map((x) => (x.tempId === tempId ? { ...x, erro: String(e) } : x)));
      toast.push({ text: "Upload falhou." });
      return;
    }

    // 3) confirma no banco
    const conf = await confirmUpload({
      postId,
      key: req.key,
      kind,
      mimeType: file.type || "application/octet-stream",
      bytes: file.size,
      width: meta.width,
      height: meta.height,
      durationMs: meta.durationMs,
    });
    if (!conf.ok) {
      setPendentes((p) => p.map((x) => (x.tempId === tempId ? { ...x, erro: conf.error } : x)));
      toast.push({ text: "Não deu para registrar a mídia." });
      return;
    }

    // 4) para vídeo, gera thumbnail em background e sobe
    if (kind === "VIDEO" && meta.thumbnailBlob) {
      try {
        const thumbName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        const thumbReq = await requestUpload({
          postId,
          originalName: `thumb-${thumbName}`,
          mimeType: "image/jpeg",
          bytes: meta.thumbnailBlob.size,
          kind: "IMAGE",
        });
        if (thumbReq.ok) {
          await putComProgresso(thumbReq.url, meta.thumbnailBlob, () => {});
          await setThumbnailKey(conf.media.id, thumbReq.key);
        }
      } catch {
        // sem thumbnail — placeholder do vídeo continua ok
      }
    }

    // 5) recarrega lista
    setPendentes((p) => p.filter((x) => x.tempId !== tempId));
    URL.revokeObjectURL(localUrl);
    const r = await listarMedia(postId);
    if (r.ok) setItens(r.media);
    router.refresh();
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(processarArquivo);
    if (inputRef.current) inputRef.current.value = "";
  }

  function trocarPosicao(id: string, delta: -1 | 1) {
    const idx = itens.findIndex((m) => m.id === id);
    const alvo = idx + delta;
    if (alvo < 0 || alvo >= itens.length) return;
    const proximo = [...itens];
    [proximo[idx], proximo[alvo]] = [proximo[alvo], proximo[idx]];
    setItens(proximo);
    startTransition(async () => {
      await reorderMedia({ postId, order: proximo.map((m) => m.id) });
      router.refresh();
    });
  }

  async function apagar(id: string) {
    const anterior = itens;
    setItens(itens.filter((m) => m.id !== id));
    const r = await removeMedia(id);
    if (!r.ok) {
      setItens(anterior);
      toast.push({ text: "Não deu para remover." });
    }
    router.refresh();
  }

  async function salvarAlt(id: string, texto: string) {
    const r = await setAltText(id, texto);
    if (!r.ok) toast.push({ text: "Não deu para salvar o texto alternativo." });
  }

  return (
    <div className="bg-white rounded-[var(--radius-card)] p-5">
      <h3 className="text-[15px] font-semibold mb-3">Mídia</h3>

      {itens.length === 0 && pendentes.length === 0 && !carregando && (
        <div className="text-[13px] text-[var(--color-muted)] mb-3 leading-relaxed">
          Sem mídia. Arraste um arquivo aqui ou use o botão abaixo. Os arquivos vão direto para o
          armazenamento — não passam por nenhum servidor intermediário.
        </div>
      )}

      <div className="space-y-3">
        {itens.map((m) => (
          <MediaCard
            key={m.id}
            m={m}
            networks={networks}
            onUp={() => trocarPosicao(m.id, -1)}
            onDown={() => trocarPosicao(m.id, 1)}
            onDelete={() => apagar(m.id)}
            onAltSave={(v) => salvarAlt(m.id, v)}
            isFirst={itens[0]?.id === m.id}
            isLast={itens[itens.length - 1]?.id === m.id}
          />
        ))}
        {pendentes.map((p) => (
          <PendingCard key={p.tempId} p={p} />
        ))}
      </div>

      <div
        className="mt-3 rounded-[var(--radius-btn)] border border-dashed p-4 text-center"
        style={{ borderColor: "var(--color-border)" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
      >
        <div className="text-[13px] text-[var(--color-muted)] mb-2">
          Arraste imagens ou vídeos aqui, ou
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Btn onClick={() => inputRef.current?.click()}>Escolher arquivos</Btn>
      </div>
    </div>
  );
}

function MediaCard({
  m,
  networks,
  onUp,
  onDown,
  onDelete,
  onAltSave,
  isFirst,
  isLast,
}: {
  m: MediaItem;
  networks: Network[];
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  onAltSave: (v: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [alt, setAlt] = useState(m.altText ?? "");
  const warnings = validarMedia(
    {
      kind: m.kind,
      mimeType: m.mimeType,
      bytes: m.bytes,
      width: m.width,
      height: m.height,
      durationMs: m.durationMs,
    },
    networks,
  );

  return (
    <div className="flex gap-3 p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-btn)]">
      <div
        className="shrink-0 rounded-[10px] overflow-hidden bg-black/5 flex items-center justify-center"
        style={{ width: 88, height: 88 }}
      >
        {m.kind === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.url} alt="" className="w-full h-full object-cover" />
        ) : m.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <VideoPlaceholder />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
            {m.kind === "IMAGE" ? "Imagem" : "Vídeo"}
          </span>
          {m.width && m.height && (
            <span className="text-[11px] text-[var(--color-muted)] tabular">
              {m.width}×{m.height}
            </span>
          )}
          {m.durationMs && (
            <span className="text-[11px] text-[var(--color-muted)] tabular">
              {formatarDuracao(m.durationMs)}
            </span>
          )}
          <span className="ml-auto flex gap-1">
            <IconBtn label="Mover para cima" disabled={isFirst} onClick={onUp}>↑</IconBtn>
            <IconBtn label="Mover para baixo" disabled={isLast} onClick={onDown}>↓</IconBtn>
            <IconBtn label="Remover" onClick={onDelete}>×</IconBtn>
          </span>
        </div>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => onAltSave(alt)}
          placeholder="Texto alternativo — opcional"
          className="w-full text-[13px] px-2.5 py-1.5 bg-white border border-[var(--color-border)] rounded-[10px] outline-none"
        />
        {warnings.length > 0 && <WarningsList warnings={warnings} />}
      </div>
    </div>
  );
}

function WarningsList({ warnings }: { warnings: MediaWarning[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {warnings.map((w, i) => (
        <li
          key={i}
          className="text-[11px] px-2 py-1 rounded-[8px]"
          style={{ background: "var(--color-warn-bg)", color: "var(--color-warn)" }}
        >
          {w.message}
        </li>
      ))}
    </ul>
  );
}

function PendingCard({ p }: { p: PendingItem }) {
  return (
    <div className="flex gap-3 p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-btn)]">
      <div className="shrink-0 rounded-[10px] overflow-hidden bg-black/5" style={{ width: 88, height: 88 }}>
        {p.file.type.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.localUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <VideoPlaceholder />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] truncate">{p.file.name}</div>
        {p.erro ? (
          <div className="text-[11px] text-[var(--color-danger)] mt-1">{p.erro}</div>
        ) : (
          <div className="mt-2 h-1 bg-[var(--color-border-soft)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-accent)] transition-[width]" style={{ width: `${p.progresso}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-7 h-7 flex items-center justify-center rounded-full text-[13px] text-[var(--color-muted)] hover:bg-white hover:text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function VideoPlaceholder() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.9">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function formatarDuracao(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

async function lerMeta(
  file: File,
  kind: "IMAGE" | "VIDEO",
): Promise<{ width?: number; height?: number; durationMs?: number; thumbnailBlob?: Blob }> {
  const url = URL.createObjectURL(file);
  try {
    if (kind === "IMAGE") {
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => {
        img.onload = () => res(null);
        img.onerror = rej;
      });
      return { width: img.naturalWidth, height: img.naturalHeight };
    } else {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      await new Promise((res, rej) => {
        video.onloadedmetadata = () => res(null);
        video.onerror = rej;
      });
      const meta = {
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        durationMs: Math.round(video.duration * 1000) || undefined,
      };
      // Thumbnail = frame ~1s ou 0.
      const thumb = await gerarThumbnailDoVideo(video).catch(() => null);
      return { ...meta, thumbnailBlob: thumb ?? undefined };
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function gerarThumbnailDoVideo(video: HTMLVideoElement): Promise<Blob | null> {
  await new Promise<void>((resolve) => {
    const t = Math.min(1, Math.max(0, video.duration / 2));
    video.currentTime = t;
    video.onseeked = () => resolve();
  });
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.75));
}

async function putComProgresso(url: string, file: Blob, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`upload ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}
