import { Finding, HandleTransaction, TransactionEvent, FindingSeverity, FindingType } from "forta-agent";
import { UNISWAP_V3_FACTORY_ADDRESS, SWAP_EVENT_SIGNATURE } from "./constants";

export const provideHandleBlock = (

): HandleTransaction => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    // filter txEvent logs for Swap event
    const swapEvents = txEvent.filterLog(SWAP_EVENT_SIGNATURE)
    
    console.log(swapEvents)


    return findings;
  };
};

export default {
  handleTransaction: provideHandleTransaction(

  ),
};
