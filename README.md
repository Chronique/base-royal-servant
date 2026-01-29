### 🛡️ Royal Servant (Abdi Dalem)

![Repo Size](https://img.shields.io/github/repo-size/Chronique/base-royal-servant?color=blue) ![License](https://img.shields.io/github/license/Chronique/smp21?color=green) [![Follow on X](https://img.shields.io/twitter/follow/adhichronique?style=social)](https://x.com/adhichronique)


Royal Servant is a Farcaster Mini App (Frame v2) built specifically for the Base ecosystem. It acts as a digital "Abdi Dalem" (Royal Servant) that helps users maintain their wallet's hygiene and security by monitoring and revoking unnecessary or high-risk token allowances.
---

***🌟 Key Features***

The app uses Javanese shadow puppetry (Wayang) themes to categorize its functions:

*🏹 Arjuna (Scanning & Guard):* Monitors active token approvals in your wallet using the Moralis API.

*💃 Srikandi (Spend Permissions):* Tracks and manages automated spend permissions, commonly used by on-chain games or apps for signature-less transactions.

*✨ Yudhistira (Health Score):* Displays a wallet health score based on active permissions and provides access to other experimental mini-apps.

*⚡ Purify (Bulk Revoke):* Allows users to revoke multiple permissions efficiently using batching if supported by the wallet.

*🔔 Royal Notifications:* Integrated native Farcaster notifications to remind users to perform routine wallet cleanups.


---


## 🛠️ Technology Stack
1. *Framework:* Next.js 15 (App Router).

2. *Blockchain:* Wagmi, Viem, and OnchainKit for seamless interaction with the Base network.

3. *Data:* Moralis API for token allowance tracking.

4. *Backend:* Supabase for securely storing Farcaster notification tokens.

5. *SDK:* Farcaster Mini App SDK v2.
---
## 🚀 Getting Started
Prerequisites
Ensure you have the latest version of Node.js and accounts for the following:

* **Supabase**
 (for notification database).

* **Moralis**
 (for the scanner API Key).

* **Vercel**
 (recommended for deployment).

*Installation*
```Bash
# Clone the repository
git clone https://github.com/Chronique/base-royal-servant.git
cd base-royal-servant
```

```bash
# Install dependencies
npm install
```

*Configuration*

```bash
Create a .env.local file in the root directory and add the following variables:
```

```Bash
NEXT_PUBLIC_URL=https://your-domain.vercel.app
NEXT_PUBLIC_MORALIS_API_KEY=your_moralis_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=your_secret_for_cron_jobs
```
---
*Development*
```Bash
# Run the development server
npm run dev
```
---
## 📡 Farcaster Integration
This app requires a valid manifest configuration for notification features and the "Pin App" button to appear:

Manifest: Located at /.well-known/farcaster.json.

Webhook: Handles notification token registration at /api/auth/webhook.

Cron Job: Sends routine reminders configured via vercel.json.

## 📂 Project Structure
* **src/app/page.tsx: Entry point with Farcaster Meta Tags.**

* **src/components/Demo.tsx: Main UI logic (Arjuna, Srikandi, Yudhistira).**

* **src/lib/supabase.ts: Database client configuration.**

* **src/app/api/auth/: Endpoints for authentication, webhooks, and cron tasks.**
