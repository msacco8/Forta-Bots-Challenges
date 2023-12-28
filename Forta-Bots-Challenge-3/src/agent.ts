import { BlockEvent, Finding, HandleBlock, getEthersProvider } from "forta-agent";
import {
  L1_ARBITRUM_ESCROW_ADDRESS,
  L1_DAI_CONTRACT_ADDRESS,
  L1_OPTIMISM_ESCROW_ADDRESS,
  L2_DAI_ADDRESS,
} from "./constants";
import { providers } from "ethers";
import { emitEscrowBalance, checkInvariant, contractAddresses } from "./utils";

export const provideHandleBlock = (provider: providers.Provider, contractAddresses: contractAddresses): HandleBlock => {
  return async (BlockEvent: BlockEvent) => {
    const findings: Finding[] = [];
    const { chainId } = await provider.getNetwork();
    const blockNumber = BlockEvent.blockNumber;
    const { l1DaiAddress, l2DaiAddress, optimismEscrow, arbitrumEscrow } = contractAddresses;

    // delegate balance logic for each chain bot is running on
    if (chainId === 1) {
      // get DAI balance for each L2's escrow contract
      await emitEscrowBalance(provider, blockNumber, l1DaiAddress, optimismEscrow, arbitrumEscrow);
    } else {
      // compare escrow balances with L2 DAI balances
      await checkInvariant(provider, blockNumber, findings, chainId, l2DaiAddress);
    }

    return findings;
  };
};

export default {
  handleBlock: provideHandleBlock(getEthersProvider(), {
    l1DaiAddress: L1_DAI_CONTRACT_ADDRESS,
    l2DaiAddress: L2_DAI_ADDRESS,
    optimismEscrow: L1_OPTIMISM_ESCROW_ADDRESS,
    arbitrumEscrow: L1_ARBITRUM_ESCROW_ADDRESS,
  }),
};
