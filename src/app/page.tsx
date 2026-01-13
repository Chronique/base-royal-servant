import { Metadata } from "next";
import App from "./app";
import { METADATA } from "~/lib/utils";

// 1. Atur agar halaman selalu dynamic (Solusi Build Error MiniKit)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 2. Konfigurasi Frame V2 (Ganti domain dengan domain Vercel kamu)
const CANONICAL_DOMAIN = "base-royal-servant.vercel.app"; 

const frame = {
  version: "next",
  imageUrl: METADATA.bannerImageUrl,
  button: {
    title: "Launch Shield",
    action: {
      type: "launch_frame",
      name: METADATA.name,
      url: METADATA.homeUrl,
      splashImageUrl: METADATA.iconImageUrl,
      splashBackgroundColor: METADATA.splashBackgroundColor,
    },
  },
  requiredCapabilities: [
    "wallet.getEthereumProvider",
    "actions.addMiniApp",
    "actions.ready"
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: METADATA.name,
    openGraph: {
      title: METADATA.name,
      description: METADATA.description,
      images: [METADATA.bannerImageUrl],
      url: METADATA.homeUrl,
      siteName: METADATA.name,
    },
    other: {
      "fc:frame": JSON.stringify(frame),
      "fc:frame:image": METADATA.bannerImageUrl,
      "fc:frame:cast_action:canonical_domain": CANONICAL_DOMAIN,
    },
  };
}

export default function Home() {
  return <App />;
}