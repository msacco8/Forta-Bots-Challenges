import {
  FindingType,
  FindingSeverity,
  HandleBlock,
  AlertsResponse,
  Alert,
  AlertQueryOptions,
  Finding,
} from "forta-agent";
import { createAddress } from "forta-agent-tools";
import { provideHandleBlock } from "./agent";
import { MockEthersProvider, TestBlockEvent } from "forta-agent-tools/lib/test";
import { AlertSource } from "forta-agent-tools/lib/utils";
import { Interface } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { contractAddresses } from "./utils";
import { BOT_ID, MAKER_INVARIANT_ALERT_ID, MAKER_ESCROW_ALERT_ID } from "./constants";

const ERC20_IFACE = new Interface([
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
]);

let mockL1Findings: Finding[] = [];

const getAlertFromFinding = (finding: Finding): Alert => {
  const { severity, type, source, timestamp, ...rest } = finding;
  const alertSource: AlertSource = {
    bot: {
      id: BOT_ID,
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

const mockGetAlerts = async (alertQuery: AlertQueryOptions): Promise<AlertsResponse> => {
  mockL1Findings.sort((a, b) => {
    return parseInt(b.metadata["blockNumber"]) - parseInt(a.metadata["blockNumber"]);
  });
  const mockAlerts = mockL1Findings.map(getAlertFromFinding);
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
};

export const createTestEscrowBalanceFinding = (
  blockNumber: string,
  optimismBalance: BigNumber,
  arbitrumBalance: BigNumber
) => {
  return Finding.fromObject({
    name: "Maker Bridge L1 DAI Escrow Balances",
    description: `The amount of DAI held in Arbitrum and Optimism's L1 escrow contracts on Maker's bridge`,
    alertId: MAKER_ESCROW_ALERT_ID,
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    metadata: {
      blockNumber,
      optimismBalance: optimismBalance.toString(),
      arbitrumBalance: arbitrumBalance.toString(),
    },
  });
};

const createTestInvariantViolationFinding = (chainId: number, chainName: string, supplies: BigNumber[]) => {
  return {
    name: "Maker Bridge L2 Dai Supply Invariant Violated",
    description: `The DAI held in Maker's Bridge's L1 escrow contract is less than the supply of ${chainName} DAI.`,
    alertId: MAKER_INVARIANT_ALERT_ID,
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
  let mockBlockEvent = new TestBlockEvent();
  let mockProvider: MockEthersProvider;

  beforeEach(async () => {
    mockL1Findings = [];
  });

  it("returns correct error if running on unsupported chain", async () => {
    const mockBadChainId = 999;
    mockProvider = resetProvider(mockBadChainId);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
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
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    mockL1Findings = await handleBlock(mockBlockEvent);
    expect(mockL1Findings).toStrictEqual([
      createTestEscrowBalanceFinding(mockBlockEvent.blockNumber.toString(), BigNumber.from(10), BigNumber.from(10)),
    ]);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const optimismFindings = await handleBlock(mockBlockEvent);
    expect(optimismFindings).toStrictEqual([]);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const arbitrumFindings = await handleBlock(mockBlockEvent);
    expect(arbitrumFindings).toStrictEqual([]);
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
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    mockL1Findings = await handleBlock(mockBlockEvent);
    expect(mockL1Findings).toStrictEqual([
      createTestEscrowBalanceFinding(mockBlockEvent.blockNumber.toString(), BigNumber.from(10), BigNumber.from(10)),
    ]);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 11);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const optimismFindings = await handleBlock(mockBlockEvent);
    expect(optimismFindings).toStrictEqual([
      expect.objectContaining(
        createTestInvariantViolationFinding(mockOptimismChainId, "Optimism", [BigNumber.from(10), BigNumber.from(11)])
      ),
    ]);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const arbitrumFindings = await handleBlock(mockBlockEvent);
    expect(arbitrumFindings).toStrictEqual([]);
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
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    mockL1Findings = await handleBlock(mockBlockEvent);
    expect(mockL1Findings).toStrictEqual([
      createTestEscrowBalanceFinding(mockBlockEvent.blockNumber.toString(), BigNumber.from(10), BigNumber.from(10)),
    ]);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const optimismFindings = await handleBlock(mockBlockEvent);
    expect(optimismFindings).toStrictEqual([]);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 11);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const arbitrumFindings = await handleBlock(mockBlockEvent);
    expect(arbitrumFindings).toStrictEqual([
      expect.objectContaining(
        createTestInvariantViolationFinding(mockArbitrumChainId, "Arbitrum", [BigNumber.from(10), BigNumber.from(11)])
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
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    mockL1Findings = await handleBlock(mockBlockEvent);
    expect(mockL1Findings).toStrictEqual([
      createTestEscrowBalanceFinding(mockBlockEvent.blockNumber.toString(), BigNumber.from(10), BigNumber.from(10)),
    ]);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 11);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const optimismFindings = await handleBlock(mockBlockEvent);
    expect(optimismFindings).toStrictEqual([
      expect.objectContaining(
        createTestInvariantViolationFinding(mockOptimismChainId, "Optimism", [BigNumber.from(10), BigNumber.from(11)])
      ),
    ]);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 11);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const arbitrumFindings = await handleBlock(mockBlockEvent);
    expect(arbitrumFindings).toStrictEqual([
      expect.objectContaining(
        createTestInvariantViolationFinding(mockArbitrumChainId, "Arbitrum", [BigNumber.from(10), BigNumber.from(11)])
      ),
    ]);
  });

  it("returns latest correct findings if there are messages from different blocks on L1", async () => {
    for (let i = 1; i < 3; i++) {
      mockProvider = resetProvider(mockEthereumChainId);
      mockBlockEvent.setNumber(i);
      mockEscrowBalances(
        mockProvider,
        mockBlockEvent.blockNumber,
        mockContractAddresses.l1DaiAddress,
        [mockContractAddresses.optimismEscrow, mockContractAddresses.arbitrumEscrow],
        [8 + i, 8 + i]
      );
      handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
      const currentBlockFindings = await handleBlock(mockBlockEvent);
      for (let finding of currentBlockFindings) {
        mockL1Findings.push(finding);
      }
    }
    expect(mockL1Findings).toStrictEqual([
      createTestEscrowBalanceFinding("1", BigNumber.from(9), BigNumber.from(9)),
      createTestEscrowBalanceFinding("2", BigNumber.from(10), BigNumber.from(10)),
    ]);

    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 11);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const optimismFindings = await handleBlock(mockBlockEvent);
    expect(optimismFindings).toStrictEqual([
      expect.objectContaining(
        createTestInvariantViolationFinding(mockOptimismChainId, "Optimism", [BigNumber.from(10), BigNumber.from(11)])
      ),
    ]);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 11);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const arbitrumFindings = await handleBlock(mockBlockEvent);
    expect(arbitrumFindings).toStrictEqual([
      expect.objectContaining(
        createTestInvariantViolationFinding(mockArbitrumChainId, "Arbitrum", [BigNumber.from(10), BigNumber.from(11)])
      ),
    ]);
  });

  it("returns empty findings if there are no alerts from L1", async () => {
    mockProvider = resetProvider(mockOptimismChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 15);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const optimismFindings = await handleBlock(mockBlockEvent);
    expect(optimismFindings).toStrictEqual([]);

    mockProvider = resetProvider(mockArbitrumChainId);
    mockL2Supply(mockProvider, mockBlockEvent.blockNumber, mockContractAddresses.l2DaiAddress, 10);
    handleBlock = provideHandleBlock(mockProvider as any, mockContractAddresses, mockGetAlerts);
    const arbitrumFindings = await handleBlock(mockBlockEvent);
    expect(arbitrumFindings).toStrictEqual([]);
  });
});
