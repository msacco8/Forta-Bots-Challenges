import { providers, Contract, BigNumber } from "ethers";
import { LRUCache } from "lru-cache";
import { TransactionDescription } from "forta-agent/dist/sdk/transaction.event";
import {
  PositionData,
  PositionDataResponse,
  Liquidatable,
  CollateralAddresses,
  CollateralBalances,
  CollateralContracts,
  CollateralQuotes,
  emptyLiquidationInfo,
  emptyPositionDataResponse,
  FetcherConfig,
} from "./agent.utils";

export default class PositionFetcher {
  readonly provider: providers.Provider;
  readonly cometAddress: string;
  readonly baseAssetAddress: string;
  readonly max: number;
  readonly collateralTokenAddresses: CollateralAddresses;
  readonly borrowThreshold: BigNumber;
  readonly borrowCallNames: string[];
  private cache: LRUCache<string, PositionData>;
  private cacheOrder: string[];
  private cacheIndices: Map<string, number>;
  private cometContract: Contract;
  private collateralTokenContracts: CollateralContracts;

  constructor(
    provider: providers.Provider,
    fetcherConfig: FetcherConfig,
    erc20ABI: string[],
    cometABI: string[],
    borrowCallNames: string[]
  ) {
    this.provider = provider;
    this.cometAddress = fetcherConfig.cometAddress.toLowerCase();
    this.cometContract = new Contract(fetcherConfig.cometAddress, cometABI, provider);

    this.collateralTokenAddresses = fetcherConfig.collateralAddresses;
    this.collateralTokenContracts = {};
    for (const token in fetcherConfig.collateralAddresses) {
      const collateralTokenContract = new Contract(fetcherConfig.collateralAddresses[token], erc20ABI, provider);
      this.collateralTokenContracts[token] = collateralTokenContract;
    }

    this.borrowCallNames = borrowCallNames;
    this.borrowThreshold = fetcherConfig.borrowThreshold;
    this.baseAssetAddress = fetcherConfig.baseAssetAddress;
    this.max = fetcherConfig.maxPositions;

    this.cache = new LRUCache<string, PositionData>({
      max: this.max,
    });
    this.cacheOrder = [];
    this.cacheIndices = new Map<string, number>();
  }

  // use LRU cache with array and index mapping to track order added for FIFO deletion when at max size
  private async addToCache(key: string, value: PositionData) {
    if (this.cache.size === this.max) {
      const mostRecentAddress: string = this.cacheOrder.pop()!;
      this.cache.delete(mostRecentAddress);
      this.cacheIndices.delete(mostRecentAddress);
    }
    this.cache.set(key, value);
    this.cacheOrder.push(key);
    this.cacheIndices.set(key, this.cacheOrder.length - 1);
  }

  // maintain LIFO functionality, performance trade off
  private async removeFromCache(keys: string[]) {
    const keysSet: Set<string> = new Set<string>();
    keys.forEach((key) => {
      keysSet.add(key);
      this.cache.delete(key);
    });
    this.cacheOrder = this.cacheOrder.filter((key) => !keysSet.has(key));
    for (const [index, key] of this.cacheOrder.entries()) {
      this.cacheIndices.set(key, index);
    }
  }

  // match function calls to send correct arguments to handleCall
  public async delegateCall(
    tx: TransactionDescription,
    from: string,
    blockNumber: number
  ): Promise<PositionDataResponse> {
    if (tx.name === "supply" || tx.name === "withdraw") {
      return this.handleCall(from, tx.args[0], blockNumber);
    } else if (tx.name === "supplyTo" || tx.name === "withdrawTo") {
      return this.handleCall(from, tx.args[1], blockNumber);
    } else if (tx.name === "supplyFrom" || tx.name === "withdrawFrom") {
      return this.handleCall(tx.args[0].toLowerCase(), tx.args[2], blockNumber);
    }
    return { ...emptyPositionDataResponse };
  }

  // query balance to determine if call signifies new/updated position, then create position object to send back
  private async handleCall(borrower: string, asset: string, blockNumber: number): Promise<PositionDataResponse> {
    const borrowBalanceOf: BigNumber = await this.cometContract.borrowBalanceOf(borrower, { blockTag: blockNumber });
    if (this.baseAssetAddress.toLowerCase() === asset.toLowerCase() && borrowBalanceOf.gt(this.borrowThreshold)) {
      const position: PositionData = {
        owner: borrower,
        token: asset,
      };
      this.addToCache(borrower, position);
      return { newPosition: true, position };
    }
    return { ...emptyPositionDataResponse };
  }

  // map over entire cache asynchronously querying liquidation state
  // if liquidatable, query collateral balances and quotes
  // remove liquidatable positions from cache and return object for each position
  public async monitorPositions(blockNumber: number): Promise<Liquidatable[]> {
    const addressesToRemove: string[] = [];
    const cacheKeys = Array.from(this.cache.keys());
    const liquidatablePromises: Promise<Liquidatable>[] = cacheKeys.map(async (owner): Promise<Liquidatable> => {
      const liquidationInfo: Liquidatable = { ...emptyLiquidationInfo };
      const position: PositionData = this.cache.get(owner)!;

      const isLiquidatable: boolean = await this.cometContract.isLiquidatable(owner, { blockTag: blockNumber });

      if (isLiquidatable) {
        addressesToRemove.push(position.owner);

        const borrowBalance = await this.cometContract.borrowBalanceOf(owner, { blockTag: blockNumber });

        const collateralBalancesPromises: Promise<BigNumber>[] = [];
        const collateralQuotesPromises: Promise<BigNumber>[] = [];

        const collateralBalances: CollateralBalances = {};
        const collateralQuotes: CollateralQuotes = {};

        for (const token in this.collateralTokenContracts) {
          collateralBalancesPromises.push(
            this.collateralTokenContracts[token].balanceOf(owner, {
              blockTag: blockNumber,
            })
          );

          // for 1 of base asset for now
          collateralQuotesPromises.push(
            this.cometContract.quoteCollateral(this.collateralTokenAddresses[token], 1, {
              blockTag: blockNumber,
            })
          );
        }

        const collateralBalancesResults: BigNumber[] = await Promise.all(collateralBalancesPromises);
        const collateralQuotesResults: BigNumber[] = await Promise.all(collateralQuotesPromises);

        Object.keys(this.collateralTokenContracts).forEach((token, index) => {
          collateralBalances[token] = collateralBalancesResults[index].toString();
          collateralQuotes[token] = collateralQuotesResults[index].toString();
        });

        liquidationInfo.borrowBalance = borrowBalance;
        liquidationInfo.collateralBalances = collateralBalances;
        liquidationInfo.collateralQuotes = collateralQuotes;
      }

      liquidationInfo.position = position;
      liquidationInfo.isLiquidatable = isLiquidatable;
      return liquidationInfo;
    });
    this.removeFromCache(addressesToRemove);
    return Promise.all(liquidatablePromises);
  }
}
