import {
  BlockEvent,
  Finding,
  Initialize,
  HandleBlock,
  HandleTransaction,
  TransactionEvent,
  getEthersProvider,
} from "forta-agent";
import {
  BORROW_CALL_NAMES,
  COMET_SIGNATURES,
  ERC20_ABI,
  COMET_ABI,
  FETCHER_CONFIG_USDC,
  FETCHER_CONFIG_WETH,
} from "./constants";
import { providers } from "ethers";
import PositionFetcher from "./position.fetcher";
import { createNewPositionFinding, createLiquidatableFinding } from "./finding";
import { PositionDataResponse, emptyPositionData, FetcherConfig, Liquidatable } from "./agent.utils";

let positionFetcherUSDC: PositionFetcher;
let positionFetcherWETH: PositionFetcher;

export const provideInitialize = (
  provider: providers.Provider,
  fetcherConfigUSDC: FetcherConfig,
  fetcherConfigWETH: FetcherConfig,
  erc20ABI: string[],
  cometABI: string[],
  borrowCallNames: string[]
): Initialize => {
  return async () => {
    positionFetcherUSDC = new PositionFetcher(provider, fetcherConfigUSDC, erc20ABI, cometABI, borrowCallNames);
    positionFetcherWETH = new PositionFetcher(provider, fetcherConfigWETH, erc20ABI, cometABI, borrowCallNames);
  };
};

export const provideHandleTransaction = (cometWithdrawSupplySignatures: string[]): HandleTransaction => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];
    const baseAssetAddresses = [positionFetcherUSDC.baseAssetAddress, positionFetcherWETH.baseAssetAddress];

    // filter transaction events for withdraw/supply calls
    await Promise.all(
      txEvent
        .filterFunction(cometWithdrawSupplySignatures, [
          positionFetcherUSDC.cometAddress,
          positionFetcherWETH.cometAddress,
        ])
        .map(async (call) => {
          // dispatch withdraw/supply call info to base asset's fetcher
          const positionResponse: PositionDataResponse =
            call.address === positionFetcherUSDC.cometAddress
              ? await positionFetcherUSDC.delegateCall(call, txEvent.from, txEvent.blockNumber)
              : call.address === positionFetcherWETH.cometAddress
                ? await positionFetcherWETH.delegateCall(call, txEvent.from, txEvent.blockNumber)
                : { newOrUpdatedPosition: false, position: emptyPositionData };

          // generate findings for new or updated positions
          if (positionResponse.newOrUpdatedPosition) {
            findings.push(createNewPositionFinding(baseAssetAddresses, positionResponse.position));
          }
        })
    );
    return findings;
  };
};

export const provideHandleBlock = (): HandleBlock => {
  return async (BlockEvent: BlockEvent) => {
    const findings: Finding[] = [];
    const blockNumber = BlockEvent.blockNumber;
    const baseAssetAddresses = [positionFetcherUSDC.baseAssetAddress, positionFetcherWETH.baseAssetAddress];

    // get liquidatable status from all positions currently in each base asset's cache
    const positions: Liquidatable[][] = await Promise.all([
      positionFetcherUSDC.monitorPositions(blockNumber),
      positionFetcherWETH.monitorPositions(blockNumber),
    ]);

    // generate findings for liquidatable positions
    positions.forEach((positionArray) => {
      positionArray.forEach((position) => {
        position.isLiquidatable && findings.push(createLiquidatableFinding(baseAssetAddresses, position));
      });
    });

    return findings;
  };
};

export default {
  initialize: provideInitialize(
    getEthersProvider(),
    FETCHER_CONFIG_USDC,
    FETCHER_CONFIG_WETH,
    ERC20_ABI,
    COMET_ABI,
    BORROW_CALL_NAMES
  ),
  handleTransaction: provideHandleTransaction(COMET_SIGNATURES),
  handleBlock: provideHandleBlock(),
};
