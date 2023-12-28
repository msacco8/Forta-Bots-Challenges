import { Finding, FindingSeverity, FindingType } from "forta-agent";
import { BigNumber } from "ethers";

export const createEscrowBalanceFinding = (
  blockNumber: string,
  optimismBalance: BigNumber,
  arbitrumBalance: BigNumber
) => {
  return Finding.fromObject({
    name: "L1 Dai Escrow Balances",
    description: `The amount of DAI held in Arbitrum and Optimism's L1 escrow contract`,
    alertId: "NETHERMIND-5",
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    metadata: {
      blockNumber,
      optimismBalance: optimismBalance.toString(),
      arbitrumBalance: arbitrumBalance.toString(),
    },
  });
};

export const createFinding = (chainId: number, chainName: string, supplies: BigNumber[]) => {
  return Finding.fromObject({
    name: "L2 Dai Supply Invariant Violated",
    description: `The DAI held in the L1 escrow contract is less than the supply of ${chainName} DAI.`,
    alertId: "NETHERMIND-L2-DAI-INVARIANT",
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
    metadata: {
      chainName,
      chainId: chainId.toString(),
      l1EscrowBalance: supplies[0].toString(),
      l2Supply: supplies[1].toString(),
    },
  });
};
