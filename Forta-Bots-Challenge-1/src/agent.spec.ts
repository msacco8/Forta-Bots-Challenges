import { FindingType, FindingSeverity, HandleTransaction } from "forta-agent";
import { Interface } from "ethers/lib/utils";
import { createAddress } from "forta-agent-tools";
import { TestTransactionEvent } from "forta-agent-tools/lib/test";
import { provideHandleTransaction } from "./agent";
import { BigNumber } from "ethers";
import { CREATE_AGENT_SIGNATURE, UPDATE_AGENT_SIGNATURE } from "./constants";

describe("Nethermind bot deployment to Forta Bot Registry", () => {
  let handleTransaction: HandleTransaction;
  let mockTxEvent = new TestTransactionEvent();
  const mockNethermindDeployerAddress = createAddress("0x02");
  const mockFortaRegistryAddress = createAddress("0x03");
  const DESTROY_AGENT_SIGNATURE = "function destroyAgent(uint256 agentId,address ,string metadata,uint256[] chainIds)";
  const AGENT_ABI = new Interface([CREATE_AGENT_SIGNATURE, UPDATE_AGENT_SIGNATURE]);
  const FALSE_ABI = new Interface([DESTROY_AGENT_SIGNATURE]);

  const mockDeploymentTxOne = [
    BigNumber.from(1),
    mockNethermindDeployerAddress,
    "Mock metadata 1",
    [BigNumber.from(137)],
  ];

  const mockDeploymentTxTwo = [
    BigNumber.from(2),
    mockNethermindDeployerAddress,
    "Mock metadata 2",
    [BigNumber.from(137)],
  ];

  beforeAll(() => {
    handleTransaction = provideHandleTransaction(
      CREATE_AGENT_SIGNATURE,
      UPDATE_AGENT_SIGNATURE,
      mockNethermindDeployerAddress,
      mockFortaRegistryAddress
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
      .setFrom(mockNethermindDeployerAddress)
      .setTo(mockFortaRegistryAddress)
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: mockDeploymentTxOne,
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Deployment",
        description: `New bot has been deployed from ${mockNethermindDeployerAddress}`,
        alertId: "NETHERMIND-1",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          from: mockDeploymentTxOne[1],
          metadata: mockDeploymentTxOne[2],
          chainIDs: Array(mockDeploymentTxOne[3]).join(", "),
        },
      }),
    ]);
  });

  it("returns correct findings if there is one bot updated by Nethermind", async () => {
    mockTxEvent
      .setFrom(mockNethermindDeployerAddress)
      .setTo(mockFortaRegistryAddress)
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: [mockDeploymentTxOne[0], mockDeploymentTxOne[2], mockDeploymentTxOne[3]],
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Updated",
        description: `Bot has been updated by ${mockNethermindDeployerAddress}`,
        alertId: "NETHERMIND-2",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          metadata: mockDeploymentTxOne[2],
          chainIDs: Array(mockDeploymentTxOne[3]).join(", "),
        },
      }),
    ]);
  });

  it("returns correct findings if there are multiple bot deployments from Nethermind", async () => {
    mockTxEvent
      .setFrom(mockNethermindDeployerAddress)
      .setTo(mockFortaRegistryAddress)
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: mockDeploymentTxOne,
      })
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: mockDeploymentTxTwo,
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Deployment",
        description: `New bot has been deployed from ${mockNethermindDeployerAddress}`,
        alertId: "NETHERMIND-1",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          from: mockDeploymentTxOne[1],
          metadata: mockDeploymentTxOne[2],
          chainIDs: Array(mockDeploymentTxOne[3]).join(", "),
        },
      }),
      expect.objectContaining({
        name: "Nethermind Forta Bot Deployment",
        description: `New bot has been deployed from ${mockNethermindDeployerAddress}`,
        alertId: "NETHERMIND-1",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxTwo[0].toString(),
          from: mockDeploymentTxTwo[1],
          metadata: mockDeploymentTxTwo[2],
          chainIDs: Array(mockDeploymentTxOne[3]).join(", "),
        },
      }),
    ]);
  });

  it("returns correct findings if there are multiple bots updated by Nethermind", async () => {
    mockTxEvent
      .setFrom(mockNethermindDeployerAddress)
      .setTo(mockFortaRegistryAddress)
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: [mockDeploymentTxOne[0], mockDeploymentTxOne[2], mockDeploymentTxOne[3]],
      })
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: [mockDeploymentTxTwo[0], mockDeploymentTxTwo[2], mockDeploymentTxTwo[3]],
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Updated",
        description: `Bot has been updated by ${mockNethermindDeployerAddress}`,
        alertId: "NETHERMIND-2",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          metadata: mockDeploymentTxOne[2],
          chainIDs: Array(mockDeploymentTxOne[3]).join(", "),
        },
      }),
      expect.objectContaining({
        name: "Nethermind Forta Bot Updated",
        description: `Bot has been updated by ${mockNethermindDeployerAddress}`,
        alertId: "NETHERMIND-2",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxTwo[0].toString(),
          metadata: mockDeploymentTxTwo[2],
          chainIDs: Array(mockDeploymentTxOne[3]).join(", "),
        },
      }),
    ]);
  });

  it("returns empty findings if there are deployment or update calls from Nethermind to a different address", async () => {
    const testRegistryAddress = createAddress("0x05");
    mockTxEvent
      .setFrom(mockNethermindDeployerAddress)
      .setTo(testRegistryAddress)
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: mockNethermindDeployerAddress,
        to: testRegistryAddress,
        arguments: mockDeploymentTxOne,
      })
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: mockNethermindDeployerAddress,
        to: testRegistryAddress,
        arguments: [mockDeploymentTxTwo[0], mockDeploymentTxTwo[2], mockDeploymentTxTwo[3]],
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there is a non-deploy or update call to the registry from Nethermind", async () => {
    mockTxEvent
      .setFrom(mockNethermindDeployerAddress)
      .setTo(mockFortaRegistryAddress)
      .addTraces({
        function: FALSE_ABI.getFunction("destroyAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: mockDeploymentTxOne,
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there is a bot deployed from a different address", async () => {
    const testAddress = createAddress("0x01");
    mockTxEvent
      .setFrom(testAddress)
      .setTo(mockFortaRegistryAddress)
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: testAddress,
        to: mockFortaRegistryAddress,
        arguments: mockDeploymentTxOne,
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([]);
  });

  it("returns correct findings if there is a mix of update, create and different function calls from Nethermind", async () => {
    mockTxEvent
      .setFrom(mockNethermindDeployerAddress)
      .setTo(mockFortaRegistryAddress)
      .addTraces({
        function: FALSE_ABI.getFunction("destroyAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: mockDeploymentTxOne,
      })
      .addTraces({
        function: AGENT_ABI.getFunction("createAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: mockDeploymentTxOne,
      })
      .addTraces({
        function: AGENT_ABI.getFunction("updateAgent"),
        from: mockNethermindDeployerAddress,
        to: mockFortaRegistryAddress,
        arguments: [mockDeploymentTxTwo[0], mockDeploymentTxTwo[2], mockDeploymentTxTwo[3]],
      });

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining({
        name: "Nethermind Forta Bot Deployment",
        description: `New bot has been deployed from ${mockNethermindDeployerAddress}`,
        alertId: "NETHERMIND-1",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxOne[0].toString(),
          from: mockDeploymentTxOne[1],
          metadata: mockDeploymentTxOne[2],
          chainIDs: Array(mockDeploymentTxOne[3]).join(", "),
        },
      }),
      expect.objectContaining({
        name: "Nethermind Forta Bot Updated",
        description: `Bot has been updated by ${mockNethermindDeployerAddress}`,
        alertId: "NETHERMIND-2",
        severity: FindingSeverity.Low,
        type: FindingType.Info,
        metadata: {
          agentID: mockDeploymentTxTwo[0].toString(),
          metadata: mockDeploymentTxTwo[2],
          chainIDs: Array(mockDeploymentTxOne[3]).join(", "),
        },
      }),
    ]);
  });
});
