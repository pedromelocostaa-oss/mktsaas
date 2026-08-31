import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pauta",
  description: "Planejamento editorial e métricas de redes sociais",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Instrument Sans para toda a UI; Newsreader para números grandes e títulos.
            Fontes hospedadas pelo Google — o handoff pede exatamente estas duas famílias. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:wght@300;400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
