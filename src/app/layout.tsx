import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "A6Hub - Nền tảng học tập & Trao đổi",
  description: "Hub của tập thể 9A6 — Khóa 26",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                var d = document.createElement('div');
                d.style.position = 'fixed';
                d.style.top = '0';
                d.style.left = '0';
                d.style.zIndex = '9999';
                d.style.background = 'red';
                d.style.color = 'white';
                d.style.padding = '10px';
                d.style.fontSize = '12px';
                d.style.width = '100%';
                d.style.wordBreak = 'break-all';
                d.innerHTML = 'JS Error: ' + e.message + ' at ' + e.filename + ':' + e.lineno;
                document.body.appendChild(d);
              });
              window.addEventListener('unhandledrejection', function(e) {
                var d = document.createElement('div');
                d.style.position = 'fixed';
                d.style.top = '40px';
                d.style.left = '0';
                d.style.zIndex = '9999';
                d.style.background = 'orange';
                d.style.color = 'white';
                d.style.padding = '10px';
                d.style.fontSize = '12px';
                d.style.width = '100%';
                d.style.wordBreak = 'break-all';
                d.innerHTML = 'Promise Error: ' + (e.reason ? e.reason.message || e.reason : 'Unknown');
                document.body.appendChild(d);
              });
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
