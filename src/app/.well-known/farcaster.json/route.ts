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
      iconUrl: METADATA.iconImageUrl,
      homeUrl: METADATA.homeUrl,
      imageUrl: METADATA.bannerImageUrl,
      splashImageUrl: METADATA.iconImageUrl,
      splashBackgroundColor: METADATA.splashBackgroundColor,
      description: METADATA.description,
      ogTitle: METADATA.name,
      ogDescription: METADATA.description,
      ogImageUrl: METADATA.bannerImageUrl,
      primaryCategory: "developer-tools",
      requiredCapabilities: [
        "actions.ready",
        "actions.signIn", 
        // "actions.openMiniApp" <-- DIHAPUS karena tidak valid
        "actions.openUrl",
        "actions.sendToken",
        "actions.viewToken", 
        "actions.composeCast",
        "actions.viewProfile",
        "actions.setPrimaryButton",
        "actions.swapToken",
        "actions.close",
        "actions.viewCast",
        "wallet.getEthereumProvider"
      ],
      requiredChains: [
        "eip155:8453", // Base
        "eip155:10"   // Optimism
      ],
      // Pastikan domain ini sama persis dengan yang ada di payload accountAssociation
      "canonicalDomain": "base-royal-servant.vercel.app",
      "noindex": false,
      "tags": ["base", "baseapp", "miniapp", "tools"]
    },
    baseBuilder: {
      "allowedAddresses": ["0x4fba95e4772be6d37a0c931D00570Fe2c9675524"],
    }
  };

  return Response.json(config);
}