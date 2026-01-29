// src/app/.well-known/farcaster.json/route.ts
import { METADATA } from "../../../lib/utils";

export async function GET() {
  const config = {
    accountAssociation: {
      header: "eyJmaWQiOjM0NTk5MywidHlwZSI6ImF1dGgiLCJrZXkiOiIweDk2Q2MxN0M3N2E1MDREM0ZERDUxNmU2NjIxMzAzMDdFZjc0M2QzMEIifQ",
      payload: "eyJkb21haW4iOiJiYXNlLXJveWFsLXNlcnZhbnQudmVyY2VsLmFwcCJ9",
      signature: "6x2Suiw0oFFTrzbZn+qMNau4GXmclA+Xv/sTImbKd1slbKeX34T0FK3el9LinmQPKdIZHNVzCj6rz1nkWSXU8hw="
    },
    frame: {
      version: "1",
      name: METADATA.name,
      appId: "6967e4a50c770beef04862b3", 
      iconUrl: METADATA.iconImageUrl,
      homeUrl: METADATA.homeUrl,
      imageUrl: METADATA.bannerImageUrl,
      splashImageUrl: METADATA.iconImageUrl, 
      splashBackgroundColor: METADATA.splashBackgroundColor,
      description: METADATA.description,
      privacyPolicyUrl: METADATA.privacyUrl,
      termsOfServiceUrl: METADATA.termsUrl,
      webhookUrl: "https://base-royal-servant.vercel.app/api/auth/webhook",
      requiredCapabilities: [
        "actions.ready",
        "actions.addMiniApp",
        "actions.signIn", 
        "actions.openUrl",
        "wallet.getEthereumProvider"
      ],
      requiredChains: ["eip155:8453"],
      "canonicalDomain": "base-royal-servant.vercel.app",
    },
    baseBuilder: {
      "builder": "bc_tvapjj4p", 
      "allowedAddresses": ["0x4fba95e4772be6d37a0c931D00570Fe2c9675524"],
    }
  };

  return Response.json(config);
}