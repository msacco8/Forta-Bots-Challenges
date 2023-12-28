import {
  FindingType,
  FindingSeverity,
  HandleBlock,
  createBlockEvent,
  AlertsResponse,
  Alert,
  AlertQueryOptions,
  SendAlertsInput,
} from "forta-agent";
import { createAddress } from "forta-agent-tools";
import { provideHandleBlock } from "./agent";
import { MockEthersProvider, TestBlockEvent } from "forta-agent-tools/lib/test";
import { AlertSource } from "forta-agent-tools/lib/utils";
import { Interface } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { contractAddresses } from "./utils";

jest.mock("forta-agent", () => ({
  ...jest.requireActual("forta-agent"),
  getAlerts: jest.fn(),
  sendAlerts: jest.fn(),
}));

const fortaAgent = require("forta-agent");

const ERC20_IFACE = new Interface([
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
]);

const getAlertFromInput = (alertInput: SendAlertsInput): Alert => {
  const { severity, type, source, timestamp, ...rest } = alertInput.finding;
  const alertSource: AlertSource = {
    bot: {
      id: alertInput.botId,
    },
    sourceAlert: {
      timestamp: timestamp.toDateString(),
    },
  };
  const alertObject = {
    severity: severity.toString(),
    findingType: type.toString(),
    source: alertSource,
    ...rest,
  };
  return Alert.fromObject(alertObject);
};

const mockAlertCalls = (mockAlerts: Alert[]) => {
  mockAlerts = [];

  fortaAgent.sendAlerts.mockImplementation((alertInput: SendAlertsInput) => {
    const alert = getAlertFromInput(alertInput);
    mockAlerts.push(alert);
  });

  fortaAgent.getAlerts.mockImplementation(async (alertQuery: AlertQueryOptions): Promise<AlertsResponse> => {
    const alerts = mockAlerts.filter(
      (alert) =>
        alertQuery.botIds &&
        alert.source &&
        alert.source.bot &&
        alert.source.bot.id &&
        alertQuery.botIds.includes(alert.source?.bot?.id) &&
        alert.alertId === alertQuery.alertId
    );
    const alertsResponse: AlertsResponse = {
      alerts,
      pageInfo: {
        hasNextPage: false,
      },
    };
    return alertsResponse;
  });
};

const createTestFinding = (chainId: number, chainName: string, supplies: BigNumber[]) => {
  return {
    name: "L2 Dai Supply Invariant Violated",
    description: `The DAI held in the L1 escrow contract is less than the supply of ${chainName} DAI.`,
    alertId: "NETHERMIND-L2-DAI-INVARIANT",
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
    metadata: {
      chainName,
      chainId: chainId.toString(),
      l1EscrowBalance: supplies[0].toString(),
      l2Supply: supplies[1].toString(),
    },
  };
};

const mockEscrowBalances = (
  mockProvider: MockEthersProvider,
  blockNumber: number,
  l1DaiAddress: string,
  escrowAddresses: string[],
  balances: number[]
) => {
  mockProvider.addCallTo(l1DaiAddress, blockNumber, ERC20_IFACE, "balanceOf", {
    inputs: [escrowAddresses[0]],
    outputs: [BigNumber.from(balances[0])],
  });

  mockProvider.addCallTo(l1DaiAddress, blockNumber, ERC20_IFACE, "balanceOf", {
    inputs: [escrowAddresses[1]],
    outputs: [BigNumber.from(balances[1])],
  });
};

const mockL2Supply = (mockProvider: MockEthersProvider, blockNumber: number, l2DaiAddress: string, supply: number) => {
  mockProvider.addCallTo(l2DaiAddress, blockNumber, ERC20_IFACE, "totalSupply", {
    inputs: [],
    outputs: [BigNumber.from(supply)],
  });
};

const resetProvider = (chainId: number) => {
  const mockProvider = new MockEthersProvider();
  mockProvider.setNetwork(chainId);
  return mockProvider;
};

const mockContractAddresses: contractAddresses = {
  l1DaiAddress: createAddress("0xae1"),
  l2DaiAddress: createAddress("0xae2"),
  optimismEscrow: createAddress("0xae3"),
  arbitrumEscrow: createAddress("0xae4"),
};
const mockEthereumChainId = 1;
const mockOptimismChainId = 10;
const mockArbitrumChainId = 42161;

describe("DAI invariant watcher bot", () => {
  let handleBlock: HandleBlock;
  let mockBlockEvent = createBlockEvent({} as any);
  let mockAlerts: Alert[] = [];
  let mockProvider: MockEthersProvider;

  beforeEach(async () => {
    mockAlertCalls(mockAlerts);
    mockBlockEvent = new TestBlockEvent();
  });

  it("returns correct error if running on unsupported chain", async () => {
    const mockBadChainId = 999;
    mockProvider = resetProvider(mockBadChainId);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    await expect(handleBlock(mockBlockEvent)).rejects.toThrow("You are running the bot in a non supported network");
  });

  it("returns empty findings if no DAI supply invariant is violated on either L2", async () => {
    mockProvider = resetProvider(mockEthereumChainId);
    mockEscrowBalances(
      mockProvider,
      mockBlockEvent.blockNumber,
      mockContractAddresses.l1DaiAddress,
      [mockContractAddresses.optimismEscrow, mockContractAddresses.arbitrumEscrow],
      [10, 10]
    );
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 15);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const findingsOne = await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const findingsTwo = await handleBlock(mockBlockEvent);

    expect(findingsOne.concat(findingsTwo)).toStrictEqual([]);
  });

  it("returns correct findings if L2 supply invariant is violated on Optimism", async () => {
    mockProvider = resetProvider(mockEthereumChainId);
    mockEscrowBalances(
      mockProvider,
      mockBlockEvent.blockNumber,
      mockContractAddresses.l1DaiAddress,
      [mockContractAddresses.optimismEscrow, mockContractAddresses.arbitrumEscrow],
      [10, 10]
    );
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 9);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const optimismFindings = await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const arbitrumFindings = await handleBlock(mockBlockEvent);

    expect(optimismFindings.concat(arbitrumFindings)).toStrictEqual([
      expect.objectContaining(
        createTestFinding(mockOptimismChainId, "Optimism", [BigNumber.from(10), BigNumber.from(9)])
      ),
    ]);
  });

  it("returns correct findings if L2 supply invariant is violated on Arbitrum", async () => {
    mockProvider = resetProvider(mockEthereumChainId);
    mockEscrowBalances(
      mockProvider,
      mockBlockEvent.blockNumber,
      mockContractAddresses.l1DaiAddress,
      [mockContractAddresses.optimismEscrow, mockContractAddresses.arbitrumEscrow],
      [10, 10]
    );
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const optimismFindings = await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 9);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const arbitrumFindings = await handleBlock(mockBlockEvent);

    expect(optimismFindings.concat(arbitrumFindings)).toStrictEqual([
      expect.objectContaining(
        createTestFinding(mockArbitrumChainId, "Arbitrum", [BigNumber.from(10), BigNumber.from(9)])
      ),
    ]);
  });

  it("returns correct findings if both L2 supply invariants are violated", async () => {
    mockProvider = resetProvider(mockEthereumChainId);
    mockEscrowBalances(
      mockProvider,
      mockBlockEvent.blockNumber,
      mockContractAddresses.l1DaiAddress,
      [mockContractAddresses.optimismEscrow, mockContractAddresses.arbitrumEscrow],
      [10, 10]
    );
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 9);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const optimismFindings = await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 9);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const arbitrumFindings = await handleBlock(mockBlockEvent);
    expect(optimismFindings.concat(arbitrumFindings)).toStrictEqual([
      expect.objectContaining(
        createTestFinding(mockOptimismChainId, "Optimism", [BigNumber.from(10), BigNumber.from(9)])
      ),
      expect.objectContaining(
        createTestFinding(mockArbitrumChainId, "Arbitrum", [BigNumber.from(10), BigNumber.from(9)])
      ),
    ]);
  });

  it("returns latest correct findings if there are messages from different blocks on L1", async () => {
    for (let i = 1; i < 3; i++) {
      mockProvider = resetProvider(mockEthereumChainId);
      mockBlockEvent = createBlockEvent({ block: { number: i } } as any);
      mockEscrowBalances(
        mockProvider,
        mockBlockEvent.blockNumber,
        mockContractAddresses.l1DaiAddress,
        [mockContractAddresses.optimismEscrow, mockContractAddresses.arbitrumEscrow],
        [8 + i, 8 + i]
      );
      handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
      await handleBlock(mockBlockEvent);
    }

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 9);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const optimismFindings = await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 9);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const arbitrumFindings = await handleBlock(mockBlockEvent);
    expect(optimismFindings.concat(arbitrumFindings)).toStrictEqual([
      expect.objectContaining(
        createTestFinding(mockOptimismChainId, "Optimism", [BigNumber.from(10), BigNumber.from(9)])
      ),
      expect.objectContaining(
        createTestFinding(mockArbitrumChainId, "Arbitrum", [BigNumber.from(10), BigNumber.from(9)])
      ),
    ]);
  });

  it("returns empty findings if there are no alerts from L1", async () => {
    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 15);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const findingsOne = await handleBlock(mockBlockEvent);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses);
    const findingsTwo = await handleBlock(mockBlockEvent);

    expect(findingsOne.concat(findingsTwo)).toStrictEqual([]);
  });
});
