import { Finding, FindingSeverity, FindingType } from "forta-agent";
import { BigNumber } from "ethers";
import { MAKER_ESCROW_ALERT_ID, MAKER_INVARIANT_ALERT_ID } from "./constants";

export const createEscrowBalanceFinding = (
  blockNumber: string,
  optimismBalance: BigNumber,
  arbitrumBalance: BigNumber
) => {
  return Finding.fromObject({
    name: "Maker Bridge L1 DAI Escrow Balances",
    description: `The amount of DAI held in Arbitrum and Optimism's L1 escrow contracts on Maker's bridge`,
    alertId: MAKER_ESCROW_ALERT_ID,
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    metadata: {
      blockNumber,
      optimismBalance: optimismBalance.toString(),
      arbitrumBalance: arbitrumBalance.toString(),
    },
  });
};

export const createInvariantViolationFinding = (chainId: number, chainName: string, supplies: BigNumber[]) => {
  return Finding.fromObject({
    name: "Maker Bridge L2 Dai Supply Invariant Violated",
    description: `The DAI held in Maker's Bridge's L1 escrow contract is less than the supply of ${chainName} DAI.`,
    alertId: MAKER_INVARIANT_ALERT_ID,
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
