import { Finding, HandleTransaction, TransactionEvent } from "forta-agent";
import { UNISWAP_V3_FACTORY_ADDRESS, SWAP_EVENT } from "./constants";
import FactoryFetcher from "./factory.fetcher";
import { providers } from "ethers";
import { createFinding } from "./findings";
import { Interface } from "@ethersproject/abi";

export const provideHandleTransaction = (
  swapEvent: string,
  uniswapFactoryAddress: string,
  provider: providers.Provider
): HandleTransaction => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];
    const fetcher: FactoryFetcher = new FactoryFetcher(provider);

    await Promise.all(
      // filter txEvent logs for Swap event
      txEvent.filterLog([swapEvent]).map(async (log) => {
        // attempt factory call on pool contract the swap occurred on
        const factoryAddress = await fetcher.getFactory(log.address, txEvent.blockNumber);

        // add finding for swaps that took place on pools created by Uniswap V3 factory
        if (factoryAddress === uniswapFactoryAddress.toLowerCase()) {
          findings.push(createFinding(log.args, log.address));
        }
      })
    );
    return findings;
  };
};

export default {
  handleTransaction: provideHandleTransaction(SWAP_EVENT, UNISWAP_V3_FACTORY_ADDRESS, providers.getDefaultProvider()),
};
