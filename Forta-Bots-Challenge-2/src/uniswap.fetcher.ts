import { providers, Contract } from "ethers";
import { LRUCache } from "lru-cache";
import { UNISWAP_POOL_ABI, ERC20_ABI } from "./constants";
import { defaultAbiCoder, getCreate2Address, solidityKeccak256 } from "ethers/lib/utils";

export type PoolData = {
  isUniswapPool: boolean;
  token0: string;
  token1: string;
  fee: number;
};

export default class UniswapFetcher {
  readonly provider: providers.Provider;
  readonly factoryAddress: string;
  readonly initCodeHash: string;
  private cache: LRUCache<string, PoolData>;

  constructor(provider: providers.Provider, factoryAddress: string, initCodeHash: string) {
    this.provider = provider;
    this.factoryAddress = factoryAddress;
    this.initCodeHash = initCodeHash;
    this.cache = new LRUCache<string, PoolData>({
      max: 10000,
    });
  }

  public async isUniswapPool(poolAddress: string, block: string | number): Promise<PoolData> {
    if (this.cache.has(poolAddress)) return this.cache.get(poolAddress) as PoolData;

    const poolContract = new Contract(poolAddress, UNISWAP_POOL_ABI, this.provider);

    try {
      // build salt pool values to get create2 address
      const token0 = await poolContract.token0({ blockTag: block });
      const token1 = await poolContract.token1({ blockTag: block });
      const fee = await poolContract.fee({ blockTag: block });
      const encoded = defaultAbiCoder.encode(["address", "address", "uint24"], [token0, token1, fee]);
      const salt = solidityKeccak256(["bytes"], [encoded]);

      // compute create2 address of pool deployed by factory and determine if it is a Uniswap pool
      const computedAddress = getCreate2Address(this.factoryAddress, salt, this.initCodeHash);
      const isUniswapPool = computedAddress.toLowerCase() === poolAddress.toLowerCase();

      // call swapped token contracts to get symbols for metadata
      const tokenZeroContract = new Contract(token0, ERC20_ABI, this.provider);
      const tokenOneContract = new Contract(token1, ERC20_ABI, this.provider);
      const tokenZeroSymbol = isUniswapPool ? await tokenZeroContract.symbol({ blockTag: block }) : "";
      const tokenOneSymbol = isUniswapPool ? await tokenOneContract.symbol({ blockTag: block }) : "";

      const poolData: PoolData = {
        isUniswapPool,
        token0: tokenZeroSymbol,
        token1: tokenOneSymbol,
        fee,
      };

      this.cache.set(poolAddress, poolData);
      return poolData;
    } catch {
      const poolData: PoolData = {
        isUniswapPool: false,
        token0: "",
        token1: "",
        fee: 0,
      };

      // set cache value to PoolData with false isUniswapPool for pools not deployed by Uniswap V3 Factory
      this.cache.set(poolAddress, poolData);
      return poolData;
    }
  }
}
