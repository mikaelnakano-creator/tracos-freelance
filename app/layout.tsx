import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Traços Detalhados - Controle de Freelances",
  description:
    "Sistema para eventos, parceiros freelancers, pagamentos parciais, adiantamentos e importacao do Google Agenda.",
  applicationName: "Traços Detalhados Freelance Control",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
