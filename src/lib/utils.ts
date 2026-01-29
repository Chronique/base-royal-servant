// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const METADATA = {
  name: "Royal Servant",
  description: "Clean up your Base wallet by revoking unnecessary token permissions.",
  bannerImageUrl: 'https://base-royal-servant.vercel.app/banner.png',
  iconImageUrl: 'https://base-royal-servant.vercel.app/icon.png',
  homeUrl: process.env.NEXT_PUBLIC_URL ?? "https://base-royal-servant.vercel.app",
  splashBackgroundColor: "#FFFFFF",
  
  // Opsional: Dokumen Pendukung
  privacyUrl: "https://base-royal-servant.vercel.app/privacy",
  termsUrl: "https://base-royal-servant.vercel.app/terms",
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}