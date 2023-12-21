import { Finding, FindingSeverity, FindingType } from "forta-agent";
import { BigNumber } from "ethers";

export const createFinding = (chainId: number, chainName: string, supplies: BigNumber[]) => {
  return Finding.fromObject({
    name: "L2 Dai Supply Invariant Violated",
    description: `The DAI held in the L1 escrow contract is less than the supply of ${chainName} DAI.`,
    alertId: "NETHERMIND-1",
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    metadata: {
      chainName,
      chainId: chainId.toString(),
      l1EscrowBalance: supplies[0].toString(),
      l2Supply: supplies[1].toString(),
    },
  });
};
