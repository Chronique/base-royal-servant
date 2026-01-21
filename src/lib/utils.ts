import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const METADATA = {
  name: "Royal Servant",
  description: "Cleaning up your Base wallet by revoking unnecessary token allowances.",
  
  bannerImageUrl: 'https://base-royal-servant.vercel.app/banner.png',
  iconImageUrl: 'https://base-royal-servant.vercel.app/icon.png',
  homeUrl: process.env.NEXT_PUBLIC_URL ?? 'https://base-royal-servant.vercel.app/icon.png',
  splashBackgroundColor: "#FFFFFF"
  
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
