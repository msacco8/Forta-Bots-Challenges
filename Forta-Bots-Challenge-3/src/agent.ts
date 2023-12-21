import { BlockEvent, Finding, Initialize, HandleBlock, getEthersProvider } from "forta-agent";
import { ERC20_ABI, L1_DAI_CONTRACT_ADDRESS } from "./constants";
import NetworkManager, { NETWORK_MAP, NetworkData } from "./network";
import { providers, Contract } from "ethers";
import { createFinding } from "./finding";

let networkManager: NetworkManager;
let l1DaiContract: Contract;

export const provideInitialize = (
  networkMap: Record<number, NetworkData>,
  ethersProvider: providers.Provider,
  l1DaiContractAddress: string,
  erc20Abi: string[]
): Initialize => {
  return async () => {
    networkManager = new NetworkManager(networkMap);
    l1DaiContract = new Contract(l1DaiContractAddress, erc20Abi, ethersProvider);
  };
};

export const provideHandleBlock = (): HandleBlock => {
  return async (BlockEvent: BlockEvent) => {
    const findings: Finding[] = [];
    const blockNumber = BlockEvent.blockNumber;

    for (const network in networkManager.networkMap) {
      // get first network details
      networkManager.setNetwork(network);

      // get balance of l2 network's l1 escrow contract and l2 DAI supply
      const escrowBalance = await networkManager.getL1Escrow(l1DaiContract, blockNumber);
      const l2DaiSupply = await networkManager.getL2Supply(blockNumber);

      // check if invariant is violated and generate finding if so
      if (escrowBalance.lt(l2DaiSupply)) {
        findings.push(createFinding(networkManager.chainId, networkManager.chainName, [escrowBalance, l2DaiSupply]));
      }
    }
    return findings;
  };
};

export default {
  initialize: provideInitialize(NETWORK_MAP, getEthersProvider(), L1_DAI_CONTRACT_ADDRESS, ERC20_ABI),
  handleBlock: provideHandleBlock(),
};
