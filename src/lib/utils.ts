// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const METADATA = {
  name: "Royal Servant",
  description: "Membersihkan wallet Base Anda dengan mencabut izin token yang tidak perlu.",
  bannerImageUrl: 'https://i.imgur.com/2bsV8mV.png',
  iconImageUrl: 'https://i.imgur.com/brcnijg.png',
  homeUrl: process.env.NEXT_PUBLIC_URL ?? "https://base-royal-servant.vercel.app",
  splashBackgroundColor: "#FFFFFF",
  
  // Opsional: Dokumen Pendukung
  privacyUrl: "https://base-royal-servant.vercel.app/privacy",
  termsUrl: "https://base-royal-servant.vercel.app/terms",
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}