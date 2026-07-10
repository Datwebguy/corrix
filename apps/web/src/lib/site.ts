/** Site-wide product constants, production Corrix */

export const SITE = {
  name: "Corrix",
  tagline: "Corroborate before you settle",
  description:
    "Corrix is the paid verification layer for the agent economy. Hire it to check claims and outputs, receive a structured receipt with a content hash, and settle in USDC on Base via CROO CAP.",
  /** Production site */
  url: "https://corrix.xyz",
  github: "https://github.com/Datwebguy/corrix",
  docsPath: "/docs",
  consolePath: "/console",
  agentStore: "https://agent.croo.network",
  capDocs: "https://docs.croo.network/developer-docs/quick-start",
  croo: "https://croo.network",
  providerHealth: "https://corrix-provider.fly.dev/health",
} as const;
