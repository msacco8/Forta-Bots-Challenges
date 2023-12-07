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

    // filter TransactionEvent for bot deployments to Forta registry
    const deploymentCalls = txEvent.filterFunction(createAgentSignature, fortaRegistryAddress);

    // filter TransactionEvent for bot updates on Forta registry
    const updateCalls = txEvent.filterFunction(updateAgentSignature, fortaRegistryAddress);

    deploymentCalls.forEach((call) => {
      // form metadata from deploy bot function arguments
      const argInfo = {
        agentID: call.args[0].toString(),
        from: call.args[1],
        metadata: call.args[2],
        chainIDs: call.args[3][0].toString(),
      };

      // add info of each deploy call to findings
      findings.push(
        Finding.fromObject({
          name: "Nethermind Forta Bot Deployment",
          description: `New bot has been deployed from ${nethermindDeployAddress}`,
          alertId: "FORTA-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: argInfo,
        })
      );
    });

    updateCalls.forEach((call) => {
      // form metadata from update bot function arguments
      const argInfo = {
        agentID: call.args[0].toString(),
        metadata: call.args[1],
        chainIDs: call.args[2][0].toString(),
      };

      // add info of each update call to findings
      findings.push(
        Finding.fromObject({
          name: "Nethermind Forta Bot Updated",
          description: `Bot has been updated by ${nethermindDeployAddress}`,
          alertId: "FORTA-2",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: argInfo,
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
