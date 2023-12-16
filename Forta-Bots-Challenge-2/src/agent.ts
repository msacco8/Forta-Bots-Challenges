import { Finding, HandleTransaction, TransactionEvent, getEthersProvider } from "forta-agent";
import { UNISWAP_FACTORY_ADDRESS, UNISWAP_INIT_CODE, SWAP_EVENT } from "./constants";
import UniswapFetcher from "./uniswap.fetcher";
import { providers } from "ethers";
import { createFinding } from "./findings";

export const provideHandleTransaction = (
  provider: providers.Provider,
  factoryAddress: string,
  initCode: string,
  swapEvent: string
): HandleTransaction => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];
    const fetcher: UniswapFetcher = new UniswapFetcher(provider, factoryAddress, initCode);

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
  handleTransaction: provideHandleTransaction(
    getEthersProvider(),
    UNISWAP_FACTORY_ADDRESS,
    UNISWAP_INIT_CODE,
    SWAP_EVENT
  ),
};
