// Shell das telas de auth. Fundo bege, logo em Newsreader, cartão branco.
// Estrutura vinda do protótipo `prototipos/pauta-auth.jsx`.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center px-5" style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-[420px] pt-[72px] pb-14">
        <div className="mb-7" style={{ fontFamily: "var(--font-serif)", fontSize: 30, lineHeight: 1 }}>
          Pauta
        </div>
        {children}
      </div>
    </div>
  );
}
