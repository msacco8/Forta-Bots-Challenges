import { providers, Contract, BigNumber } from "ethers";
import { LRUCache } from "lru-cache";
import { READ_FACTORY_ABI } from "./constants";
// import NetworkData from "./network";
// import { BALANCEOF_ABI } from "./utils";

export default class PoolVerifier {
  readonly provider: providers.Provider;
  private cache: LRUCache<string, Promise<string>>; 

  constructor(provider: providers.Provider) {
    this.provider = provider;
    this.cache = new LRUCache<string, Promise<string>>({
      max: 10000,
    });
    // this.networkManager = networkManager;
    // this.usdcContract = new Contract(networkManager.usdcAddress, BALANCEOF_ABI, provider);
    // this.dydxContract = new Contract(networkManager.dydxAddress, BALANCEOF_ABI, provider);
  }

  // public setTokensContract() {
  //   if (this.usdcContract.address != this.networkManager.usdcAddress) {
  //     this.usdcContract = new Contract(this.networkManager.usdcAddress, BALANCEOF_ABI, this.provider);
  //   }
  //   if (this.dydxContract.address != this.networkManager.dydxAddress) {
  //     this.dydxContract = new Contract(this.networkManager.dydxAddress, BALANCEOF_ABI, this.provider);
  //   }
  // }

  public async getFactory(poolAddress: string): Promise<string> {

    if (this.cache.has(poolAddress)) return this.cache.get(poolAddress) as Promise<string>;

    const poolContract = new Contract(poolAddress, READ_FACTORY_ABI, this.provider);
    const factoryAddress = await poolContract.factory();
    this.cache.set(poolAddress, factoryAddress);

    return factoryAddress;
  }

}