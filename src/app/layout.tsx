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
};




export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Hardcoded meta tag untuk verifikasi Base Build */}
        <meta property="base:app_id" content="6967e4a50c770beef04862b3" />
        </head>
       <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}