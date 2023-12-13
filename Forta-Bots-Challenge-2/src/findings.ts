import { Finding, FindingSeverity, FindingType } from "forta-agent";

export const createFinding = (args: any, poolAddress: string) => {
  return Finding.fromObject({
    name: `Uniswap V3 Swap Detected`,
    description: `A swap has been detected on Uniswap V3's pool at ${poolAddress.toLowerCase()} between ${args[0].toLowerCase()} and ${
      args[1].toLowerCase()
    }`,
    alertId: "NETHERMIND-1",
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    timestamp: new Date("December 11, 2023 00:00:00"),
    metadata: {
      sender: args[0].toLowerCase(),
      recipient: args[1].toLowerCase(),
      amount0: args[2].toString(),
      amount1: args[3].toString(),
      sqrtPriceX96: args[4].toString(),
      liquidity: args[5].toString(),
      tick: args[6].toString(),
      pool: poolAddress.toLowerCase(),
    },
  });
};
