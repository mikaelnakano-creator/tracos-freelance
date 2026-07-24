import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Traços Freelance",
  description:
    "Gestão de eventos, parceiros freelancers, pagamentos e importação do Google Agenda para a Traços Detalhados.",
  applicationName: "Traços Freelance",
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
