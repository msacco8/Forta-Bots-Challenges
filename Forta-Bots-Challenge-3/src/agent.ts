import { GetAlerts, BlockEvent, Finding, HandleBlock, getAlerts, getEthersProvider } from "forta-agent";
import {
  ETH_CHAIN_ID,
  L1_ARBITRUM_ESCROW_ADDRESS,
  L1_DAI_CONTRACT_ADDRESS,
  L1_OPTIMISM_ESCROW_ADDRESS,
  L2_DAI_ADDRESS,
} from "./constants";
import { providers } from "ethers";
import { emitEscrowBalance, checkInvariant, contractAddresses, escrowBalances } from "./utils";

let prevEscrowBalances: escrowBalances;

export const provideHandleBlock = (
  provider: providers.Provider,
  contractAddresses: contractAddresses,
  getAlerts: GetAlerts
): HandleBlock => {
  return async (BlockEvent: BlockEvent) => {
    const findings: Finding[] = [];
    const { chainId } = await provider.getNetwork();
    const blockNumber = BlockEvent.blockNumber;
    const { l1DaiAddress, l2DaiAddress, optimismEscrow, arbitrumEscrow } = contractAddresses;

    // delegate balance logic for each chain bot is running on
    if (chainId === ETH_CHAIN_ID) {
      // get DAI balance for each L2's escrow contract
      prevEscrowBalances = await emitEscrowBalance(
        provider,
        blockNumber,
        l1DaiAddress,
        optimismEscrow,
        arbitrumEscrow,
        prevEscrowBalances,
        findings
      );
    } else {
      // compare escrow balances with L2 DAI balances
      await checkInvariant(provider, blockNumber, findings, chainId, l2DaiAddress, getAlerts);
    }

    return findings;
  };
};

export default {
  handleBlock: provideHandleBlock(
    getEthersProvider(),
    {
      l1DaiAddress: L1_DAI_CONTRACT_ADDRESS,
      l2DaiAddress: L2_DAI_ADDRESS,
      optimismEscrow: L1_OPTIMISM_ESCROW_ADDRESS,
      arbitrumEscrow: L1_ARBITRUM_ESCROW_ADDRESS,
    },
    getAlerts
  ),
};
