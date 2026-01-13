import { Metadata } from "next";
import App from "./app";
import { METADATA } from "~/lib/utils";

// 1. Pastikan halaman bersifat dynamic agar hook OnchainKit/Wagmi tidak error saat build
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

// 2. Gunakan fungsi generateMetadata untuk menggabungkan semua tag 'other'
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
      
     
    },
  };
}

export default function Home() {
  return <App />;
}