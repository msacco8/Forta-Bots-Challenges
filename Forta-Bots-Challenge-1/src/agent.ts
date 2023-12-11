import { Finding, HandleTransaction, TransactionEvent, FindingSeverity, FindingType } from "forta-agent";
import {
  CREATE_AGENT_SIGNATURE,
  UPDATE_AGENT_SIGNATURE,
  FORTA_REGISTRY_ADDRESS,
  NETHERMIND_FORTA_DEPLOYER_ADDRESS,
} from "./constants";

export const provideHandleTransaction = (
  createAgentSignature: string,
  updateAgentSignature: string,
  nethermindDeployAddress: string,
  fortaRegistryAddress: string
): HandleTransaction => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    // return empty findings if TransactionEvent is not from Nethermind
    if (txEvent.from !== nethermindDeployAddress.toLowerCase()) {
      return findings;
    }

    // filter TransactionEvent for bot deployments and updates on Forta registry
    const functionCalls = txEvent.filterFunction([createAgentSignature, updateAgentSignature], fortaRegistryAddress);

    functionCalls.forEach((call) => {
      // boolean to update metadata based on type of function call
      const isCreateAgent = call.name === "createAgent";

      // add info of each call to findings
      findings.push(
        Finding.fromObject({
          name: `Nethermind Forta Bot ${isCreateAgent ? "Deployment" : "Updated"}`,
          description: isCreateAgent
            ? `New bot has been deployed from ${nethermindDeployAddress}`
            : `Bot has been updated by ${nethermindDeployAddress}`,
          alertId: isCreateAgent ? "NETHERMIND-1" : "NETHERMIND-2",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: isCreateAgent
            ? {
                agentID: call.args[0].toString(),
                from: call.args[1],
                metadata: call.args[2],
                chainIDs: call.args[3].join(", "),
              }
            : {
                agentID: call.args[0].toString(),
                metadata: call.args[1],
                chainIDs: call.args[2].join(", "),
              },
        })
      );
    });

    return findings;
  };
};

export default {
  handleTransaction: provideHandleTransaction(
    CREATE_AGENT_SIGNATURE,
    UPDATE_AGENT_SIGNATURE,
    NETHERMIND_FORTA_DEPLOYER_ADDRESS,
    FORTA_REGISTRY_ADDRESS
  ),
};
