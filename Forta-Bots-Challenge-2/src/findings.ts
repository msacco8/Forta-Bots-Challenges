import { Finding, FindingSeverity, FindingType } from "forta-agent";
import { PoolData } from "./uniswap.fetcher";

export const createFinding = (args: any, poolAddress: string, poolData: PoolData) => {
  return Finding.fromObject({
    name: `Uniswap V3 Swap Detected`,
    description: `A ${poolData.token0}/${
      poolData.token1
    } swap has been detected on Uniswap V3's pool at ${poolAddress.toLowerCase()}`,
    alertId: "NETHERMIND-1",
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    metadata: {
      sender: args[0].toLowerCase(),
      recipient: args[1].toLowerCase(),
      token0: poolData.token0,
      token1: poolData.token1,
      amount0: args[2].toString(),
      amount1: args[3].toString(),
      fee: poolData.fee.toString(),
      sqrtPriceX96: args[4].toString(),
      liquidity: args[5].toString(),
      tick: args[6].toString(),
      pool: poolAddress.toLowerCase(),
    },
  });
};

export const createTestFinding = (args: any, poolAddress: string, poolData: PoolData) => {
  return {
    name: `Uniswap V3 Swap Detected`,
    description: `A ${poolData.token0}/${
      poolData.token1
    } swap has been detected on Uniswap V3's pool at ${poolAddress.toLowerCase()}`,
    alertId: "NETHERMIND-1",
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    metadata: {
      sender: args[0].toLowerCase(),
      recipient: args[1].toLowerCase(),
      token0: poolData.token0,
      token1: poolData.token1,
      amount0: args[2].toString(),
      amount1: args[3].toString(),
      fee: poolData.fee.toString(),
      sqrtPriceX96: args[4].toString(),
      liquidity: args[5].toString(),
      tick: args[6].toString(),
      pool: poolAddress.toLowerCase(),
    },
  };
};
