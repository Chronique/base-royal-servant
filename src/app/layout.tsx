import type { Metadata } from "next";
import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { METADATA } from "~/lib/utils";

export const metadata: Metadata = {
  title: METADATA.name,
  description: METADATA.description,
  openGraph: {
    title: METADATA.name,
    description: METADATA.description,
    images: [METADATA.bannerImageUrl],
    url: METADATA.homeUrl,
    siteName: METADATA.name
  },
  // --- TAMBAHKAN BAGIAN INI UNTUK VERIFIKASI BASE ---
  other: {
    'base:app_id': '6966c5b3cf19b2d92b9f7348',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
       <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}