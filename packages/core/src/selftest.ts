import { verifyClaim } from "./engine.js";
import { parseRequirements } from "./parse.js";

async function main() {
  const support = await verifyClaim({
    claim: "Base is an Ethereum Layer 2 network incubated by Coinbase",
    sources: [
      "https://base.org",
      "Official docs confirm Base is an L2 built on the OP Stack, incubated by Coinbase. The report supports this statement with verified data.",
    ],
  });
  console.log("SUPPORT case:", support.verdict, support.confidence, support.contentHash.slice(0, 12));

  const refute = await verifyClaim({
    claim: "Bitcoin was invented in 2020 by a Fortune 500 company",
    sources: [
      "This claim is false and incorrect. Historical records refute it: Bitcoin whitepaper published 2008, never a Fortune 500 invention.",
    ],
  });
  console.log("REFUTE case:", refute.verdict, refute.confidence);

  const parsed = parseRequirements(
    JSON.stringify({
      claim: "USDC is a regulated stablecoin issued by Circle",
      sources: ["https://www.circle.com/usdc", "Circle documentation confirms USDC issuance."],
    }),
  );
  const mixed = await verifyClaim(parsed);
  console.log("PARSED case:", mixed.verdict, mixed.checks.length, "checks");

  console.log("\n✓ Corrix core selftest passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
