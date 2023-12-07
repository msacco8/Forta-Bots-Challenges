import { FindingType, FindingSeverity, HandleTransaction } from "forta-agent";
import { Interface } from "ethers/lib/utils";
import { createAddress } from "forta-agent-tools";
import { TestTransactionEvent } from "forta-agent-tools/lib/test";
import { provideHandleTransaction } from "./agent";
import { BigNumber } from "ethers";
import {
  CREATE_AGENT_SIGNATURE,
  DESTROY_AGENT_SIGNATURE,
  FORTA_REGISTRY_ADDRESS,
  NETHERMIND_FORTA_DEPLOYER_ADDRESS,
  UPDATE_AGENT_SIGNATURE,
} from "./constants";

describe("Nethermind bot deployment to Forta Bot Registry", () => {
  let handleTransaction: HandleTransaction;
  let mockTxEvent = new TestTransactionEvent();
  const AGENT_ABI = new Interface([CREATE_AGENT_SIGNATURE, UPDATE_AGENT_SIGNATURE]);
  const FALSE_ABI = new Interface([DESTROY_AGENT_SIGNATURE]);

  const mockDeploymentTxOne = [
    BigNumber.from(1),
    NETHERMIND_FORTA_DEPLOYER_ADDRESS,
    "Mock metadata 1",
    [BigNumber.from(137)],
  ];

  const mockDeploymentTxTwo = [
    BigNumber.from(2),
    NETHERMIND_FORTA_DEPLOYER_ADDRESS,
    "Mock metadata 2",
    [BigNumber.from(137)],
  ];

  beforeAll(() => {
    handleTransaction = provideHandleTransaction(
      CREATE_AGENT_SIGNATURE,
      UPDATE_AGENT_SIGNATURE,
      NETHERMIND_FORTA_DEPLOYER_ADDRESS,
      FORTA_REGISTRY_ADDRESS
    );
  });

  beforeEach(() => {
    mockTxEvent = new TestTransactionEvent();
  });

  it("returns empty findings if there are no bot deployments or updates", async () => {
    const findings = await handleTransaction(mockTxEvent);
    expect(findings).toStrictEqual([]);
  });

  it("returns correct findings if there is one bot deployment from Nethermind", async () => {
    mockTxEvent
      .setFrom(NETHERMIND_FORTA_DEPLOYER_ADDRESS)
      .setTo(FORTA_REGISTRY_ADDRESS)
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: mockDeploymentTxOne,
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Deployment",
        description: `New bot has been deployed from ${NETHERMIND_FORTA_DEPLOYER_ADDRESS}`,
        alertId: "FORTA-1",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          from: mockDeploymentTxOne[1],
          metadata: mockDeploymentTxOne[2],
          chainIDs: mockDeploymentTxOne[3].toString(),
        },
      }),
    ]);
  });
  it("returns correct findings if there is one bot updated by Nethermind", async () => {
    mockTxEvent
      .setFrom(NETHERMIND_FORTA_DEPLOYER_ADDRESS)
      .setTo(FORTA_REGISTRY_ADDRESS)
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: [mockDeploymentTxOne[0], mockDeploymentTxOne[2], mockDeploymentTxOne[3]],
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Updated",
        description: `Bot has been updated by ${NETHERMIND_FORTA_DEPLOYER_ADDRESS}`,
        alertId: "FORTA-2",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          metadata: mockDeploymentTxOne[2],
          chainIDs: mockDeploymentTxOne[3].toString(),
        },
      }),
    ]);
  });
  it("returns correct findings if there are multiple bot deployments from Nethermind", async () => {
    mockTxEvent
      .setFrom(NETHERMIND_FORTA_DEPLOYER_ADDRESS)
      .setTo(FORTA_REGISTRY_ADDRESS)
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: mockDeploymentTxOne,
      })
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: mockDeploymentTxTwo,
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Deployment",
        description: `New bot has been deployed from ${NETHERMIND_FORTA_DEPLOYER_ADDRESS}`,
        alertId: "FORTA-1",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          from: mockDeploymentTxOne[1],
          metadata: mockDeploymentTxOne[2],
          chainIDs: mockDeploymentTxOne[3].toString(),
        },
      }),
      expect.objectContaining({
        name: "Nethermind Forta Bot Deployment",
        description: `New bot has been deployed from ${NETHERMIND_FORTA_DEPLOYER_ADDRESS}`,
        alertId: "FORTA-1",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxTwo[0].toString(),
          from: mockDeploymentTxTwo[1],
          metadata: mockDeploymentTxTwo[2],
          chainIDs: mockDeploymentTxTwo[3].toString(),
        },
      }),
    ]);
  });
  it("returns correct findings if there are multiple bots updated by Nethermind", async () => {
    mockTxEvent
      .setFrom(NETHERMIND_FORTA_DEPLOYER_ADDRESS)
      .setTo(FORTA_REGISTRY_ADDRESS)
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: [mockDeploymentTxOne[0], mockDeploymentTxOne[2], mockDeploymentTxOne[3]],
      })
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: [mockDeploymentTxTwo[0], mockDeploymentTxTwo[2], mockDeploymentTxTwo[3]],
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Updated",
        description: `Bot has been updated by ${NETHERMIND_FORTA_DEPLOYER_ADDRESS}`,
        alertId: "FORTA-2",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          metadata: mockDeploymentTxOne[2],
          chainIDs: mockDeploymentTxOne[3].toString(),
        },
      }),
      expect.objectContaining({
        name: "Nethermind Forta Bot Updated",
        description: `Bot has been updated by ${NETHERMIND_FORTA_DEPLOYER_ADDRESS}`,
        alertId: "FORTA-2",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxTwo[0].toString(),
          metadata: mockDeploymentTxTwo[2],
          chainIDs: mockDeploymentTxTwo[3].toString(),
        },
      }),
    ]);
  });
  it("returns empty findings if there is a non-deploy or update call to the registry from Nethermind", async () => {
    mockTxEvent
      .setFrom(NETHERMIND_FORTA_DEPLOYER_ADDRESS)
      .setTo(FORTA_REGISTRY_ADDRESS)
      .addTraces({
        function: FALSE_ABI.getFunction("destroyAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: mockDeploymentTxOne,
      });
    const findings = await handleTransaction(mockTxEvent);
    expect(findings).toStrictEqual([]);
  });
  it("returns empty findings if there is a bot deployed from a different address", async () => {
    const testAddress = createAddress("0x01");
    mockTxEvent
      .setFrom(testAddress)
      .setTo(FORTA_REGISTRY_ADDRESS)
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: testAddress,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: mockDeploymentTxOne,
      });
    const findings = await handleTransaction(mockTxEvent);
    expect(findings).toStrictEqual([]);
  });
  it("returns correct findings if there is a mix of update, create and different function calls from Nethermind", async () => {
    mockTxEvent
      .setFrom(NETHERMIND_FORTA_DEPLOYER_ADDRESS)
      .setTo(FORTA_REGISTRY_ADDRESS)
      .addTraces({
        function: FALSE_ABI.getFunction("destroyAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: mockDeploymentTxOne,
      })
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: mockDeploymentTxOne,
      })
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: NETHERMIND_FORTA_DEPLOYER_ADDRESS,
        to: FORTA_REGISTRY_ADDRESS,
        arguments: [mockDeploymentTxTwo[0], mockDeploymentTxTwo[2], mockDeploymentTxTwo[3]],
      });
    const findings = await handleTransaction(mockTxEvent);
    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Deployment",
        description: `New bot has been deployed from ${NETHERMIND_FORTA_DEPLOYER_ADDRESS}`,
        alertId: "FORTA-1",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          from: mockDeploymentTxOne[1],
          metadata: mockDeploymentTxOne[2],
          chainIDs: mockDeploymentTxOne[3].toString(),
        },
      }),
      expect.objectContaining({
        name: "Nethermind Forta Bot Updated",
        description: `Bot has been updated by ${NETHERMIND_FORTA_DEPLOYER_ADDRESS}`,
        alertId: "FORTA-2",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxTwo[0].toString(),
          metadata: mockDeploymentTxTwo[2],
          chainIDs: mockDeploymentTxTwo[3].toString(),
        },
      }),
    ]);
  });
});
