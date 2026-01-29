// src/app/page.tsx
import { Metadata } from "next";
import App from "./app";
import { METADATA } from "~/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CANONICAL_DOMAIN = "base-royal-servant.vercel.app"; 

const frame = {
  version: "next",
  imageUrl: METADATA.bannerImageUrl,
  button: {
    title: "Revoke Approvals",
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
    description: METADATA.description,
    openGraph: {
      title: METADATA.name,
      description: METADATA.description,
      images: [METADATA.bannerImageUrl],
      url: METADATA.homeUrl,
    },
    other: {
      "fc:frame": JSON.stringify(frame),
      "fc:frame:image": METADATA.bannerImageUrl,
      "fc:frame:cast_action:canonical_domain": CANONICAL_DOMAIN,
      // Kunci untuk memunculkan tombol lonceng notifikasi
      "fc:frame:manifest": `${METADATA.homeUrl}/.well-known/farcaster.json`, 
      'base:app_id': '6967e4a50c770beef04862b3',
    },
  };
}

export default function Home() {
  return <App />;
}