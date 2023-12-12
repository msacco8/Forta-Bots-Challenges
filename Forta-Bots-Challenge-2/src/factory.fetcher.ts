import { providers, Contract } from "ethers";
import { LRUCache } from "lru-cache";
import { READ_FACTORY_ABI } from "./constants";

export default class FactoryFetcher {
  readonly provider: providers.Provider;
  private cache: LRUCache<string, Promise<string | null>>;

  constructor(provider: providers.Provider) {
    this.provider = provider;
    this.cache = new LRUCache<string, Promise<string | null>>({
      max: 10000,
    });
  }

  public async getFactory(poolAddress: string, block: string | number): Promise<string | null> {
    if (this.cache.has(poolAddress)) return this.cache.get(poolAddress) as Promise<string | null>;

    let factoryAddress;
    const poolContract = new Contract(poolAddress, READ_FACTORY_ABI, this.provider);

    try {
      // attempt factory call on pool contract
      factoryAddress = await poolContract.factory({ blockTag: block });
      this.cache.set(poolAddress, factoryAddress.toLowerCase());
      return factoryAddress.toLowerCase();
    } catch {
      // set cache value to null for pool with no read factory function
      this.cache.set(poolAddress, Promise.resolve(null));
      return null;
    }
  }
}
