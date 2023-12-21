import { providers, ethers, Contract, BigNumber } from "ethers";
import { getEthersProvider } from "forta-agent";
import {
  ARBITRUM_DAI_ADDRESS,
  L1_ARBITRUM_ESCROW_ADDRESS,
  L1_OPTIMISM_ESCROW_ADDRESS,
  OPTIMISM_DAI_ADDRESS,
  ERC20_ABI,
} from "./constants";

export interface NetworkData {
  chainId: number;
  chainName: string;
  daiContract: string;
  escrowContract: string;
  provider: any;
}

const OPTIMISM_DAI_DATA: NetworkData = {
  chainId: 10,
  chainName: "Optimism",
  daiContract: OPTIMISM_DAI_ADDRESS,
  escrowContract: L1_OPTIMISM_ESCROW_ADDRESS,
  provider: new ethers.providers.JsonRpcProvider("https://mainnet.optimism.io"),
};

const ARBITRUM_DAI_DATA: NetworkData = {
  chainId: 42161,
  chainName: "Arbitrum",
  daiContract: ARBITRUM_DAI_ADDRESS,
  escrowContract: L1_ARBITRUM_ESCROW_ADDRESS,
  provider: new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc"),
};

export const NETWORK_MAP: Record<number, NetworkData> = {
  10: OPTIMISM_DAI_DATA,
  42161: ARBITRUM_DAI_DATA,
};

export default class NetworkManager implements NetworkData {
  public chainId: number;
  public chainName: string;
  public daiContract: string;
  public escrowContract: string;
  public provider: providers.Provider;
  networkMap: Record<number, NetworkData>;

  constructor(networkMap: Record<number, NetworkData>) {
    this.chainId = 0;
    this.chainName = "";
    this.daiContract = "";
    this.escrowContract = "";
    this.provider = getEthersProvider();
    this.networkMap = networkMap;
  }

  public setNetwork(networkId: string) {
    try {
      const { chainId, chainName, daiContract, escrowContract, provider } = this.networkMap[parseInt(networkId)];
      this.chainId = chainId;
      this.chainName = chainName;
      this.daiContract = daiContract;
      this.escrowContract = escrowContract;
      this.provider = provider;
    } catch {
      // The bot is run in a network not defined in the networkMap.
      throw new Error("You are running the bot in a non supported network");
    }
  }

  public async getL1Escrow(contract: Contract, blockNumber: number): Promise<BigNumber> {
    const escrowBalance = await contract.balanceOf(this.escrowContract, { blockTag: blockNumber });
    return escrowBalance;
  }

  public async getL2Supply(blockNumber: number): Promise<BigNumber> {
    const l2DaiContract = new Contract(this.daiContract, ERC20_ABI, this.provider);
    const l2Balance = await l2DaiContract.totalSupply({ blockTag: blockNumber });
    return l2Balance;
  }
}
