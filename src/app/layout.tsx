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
  other: {
    // Talent Protocol domain verification
    "talentapp:project_verification": "74c6887ee43e2141f27949c613ec28e0fa9fabcf3ad55a2f3d191278f70108b0934aa63c6df19f25e72080c9b83212cefcd5c7a107d5263ba16f1361ec135127",
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
        <meta name="base:app_id" content="6967e4a50c770beef04862b3" />
        <meta property="base:app_id" content="6967e4a50c770beef04862b3" />
        </head>
       <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}