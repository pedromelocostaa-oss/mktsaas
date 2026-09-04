// Configurações → Avisos. Preferências que de fato desligam o envio (docs/07).
// Cada canal desliga tanto o e-mail quanto a notificação in-app.

import { pegarPreferencias } from "@/server/services/notifications";
import { AVISO_LABELS } from "@/lib/notif-labels";
import { AvisosForm } from "./avisos-form";

export const dynamic = "force-dynamic";

export default async function AvisosPage() {
  const prefs = await pegarPreferencias();
  if (!prefs) return null;
  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-6 py-4 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
        <div className="text-[15px] font-semibold">Avisos</div>
        <div className="text-[13px] text-[var(--color-muted)]">
          Cada caixa controla tanto o e-mail quanto o sino aqui em cima. Convites, confirmação de
          e-mail e reset de senha sempre chegam — não são notificação.
        </div>
      </div>
      <AvisosForm inicial={prefs} labels={AVISO_LABELS} />
    </div>
  );
}
