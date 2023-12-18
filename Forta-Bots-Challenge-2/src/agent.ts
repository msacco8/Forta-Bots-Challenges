import { Finding, HandleTransaction, Initialize, TransactionEvent, getEthersProvider } from "forta-agent";
import { UNISWAP_FACTORY_ADDRESS, UNISWAP_INIT_CODE, SWAP_EVENT } from "./constants";
import UniswapFetcher from "./uniswap.fetcher";
import { providers } from "ethers";
import { createFinding } from "./findings";

let fetcher: UniswapFetcher;

export const provideInitialize = (
  provider: providers.Provider,
  factoryAddress: string,
  initCode: string
): Initialize => {
  return async () => {
    fetcher = new UniswapFetcher(provider, factoryAddress, initCode);
  };
};

export const provideHandleTransaction = (swapEvent: string): HandleTransaction => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    await Promise.all(
      // filter txEvent logs for Swap event
      txEvent.filterLog(swapEvent).map(async (log) => {
        const poolData = await fetcher.isUniswapPool(log.address, txEvent.blockNumber);

        // add finding for swaps that took place on pools created by Uniswap V3 factory
        if (poolData.isUniswapPool) {
          findings.push(createFinding(log.args, log.address, poolData));
        }
      })
    );
    return findings;
  };
};

export default {
  initialize: provideInitialize(getEthersProvider(), UNISWAP_FACTORY_ADDRESS, UNISWAP_INIT_CODE),
  handleTransaction: provideHandleTransaction(SWAP_EVENT),
};
