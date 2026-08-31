// Registry único. `adapterFor(network)` sempre devolve algo — nunca undefined.

import type { Network } from "@prisma/client";
import type { SocialAdapter } from "./adapter";
import { instagramAdapter, facebookAdapter } from "./meta";
import { tiktokAdapter, youtubeAdapter, linkedinAdapter, xAdapter } from "./manual";

const REG: Record<Network, SocialAdapter> = {
  INSTAGRAM: instagramAdapter,
  FACEBOOK: facebookAdapter,
  TIKTOK: tiktokAdapter,
  YOUTUBE: youtubeAdapter,
  LINKEDIN: linkedinAdapter,
  X: xAdapter,
};

export function adapterFor(network: Network): SocialAdapter {
  return REG[network];
}

export function isAutomatic(network: Network): boolean {
  return REG[network].automatic;
}
