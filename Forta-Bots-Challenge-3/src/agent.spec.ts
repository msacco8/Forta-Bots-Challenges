import { FindingType, FindingSeverity, Initialize, HandleBlock, createBlockEvent } from "forta-agent";
import { createAddress } from "forta-agent-tools";
import { NetworkData } from "./network";
import { provideHandleBlock, provideInitialize } from "./agent";
import { MockEthersProvider, TestBlockEvent } from "forta-agent-tools/lib/test";
import { Interface } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const ERC20_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
];

const MOCK_L2_DATA_ONE: NetworkData = {
  chainId: 11,
  chainName: "mockChainOne",
  daiContract: createAddress("0x01"),
  escrowContract: createAddress("0x02"),
  provider: new MockEthersProvider() as any,
};

const MOCK_L2_DATA_TWO: NetworkData = {
  chainId: 22,
  chainName: "mockChainTwo",
  daiContract: createAddress("0x01"),
  escrowContract: createAddress("0x03"),
  provider: new MockEthersProvider() as any,
};

// format: [escrowSupply, l2DaiSupply]
const SUPPLY_TEST_DATA: [BigNumber, BigNumber][] = [
  [BigNumber.from(10), BigNumber.from(1)],
  [BigNumber.from(1000), BigNumber.from(1000)],
  [BigNumber.from(5), BigNumber.from(100)],
  [BigNumber.from(50), BigNumber.from(60)],
];

const mockNetworkMap: Record<number, NetworkData> = {
  11: MOCK_L2_DATA_ONE,
  22: MOCK_L2_DATA_TWO,
};

const mockL1DaiAddress = createAddress("0xae1");

const ERC20_IFACE = new Interface(ERC20_ABI);

const createTestFinding = (chainId: number, chainName: string, supplies: BigNumber[]) => {
  return {
    name: "L2 Dai Supply Invariant Violated",
    description: `The supply of ${chainName} DAI is less than the DAI held in the L1 escrow contract.`,
    alertId: "NETHERMIND-1",
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    metadata: {
      chainName,
      chainId: chainId.toString(),
      l1EscrowBalance: supplies[0].toString(),
      l2Supply: supplies[1].toString(),
    },
  };
};

describe("DAI invariant watcher bot", () => {
  let handleBlock: HandleBlock;
  let initialize: Initialize;
  let mockProvider: MockEthersProvider = new MockEthersProvider();
  let mockBlockEvent = createBlockEvent({} as any);

  beforeAll(() => {
    handleBlock = provideHandleBlock();
  });

  beforeEach(async () => {
    initialize = provideInitialize(mockNetworkMap, mockProvider as any, mockL1DaiAddress, ERC20_ABI);
    await initialize();
    mockBlockEvent = new TestBlockEvent();
  });

  it("returns empty findings if no DAI supply invariant is violated", async () => {
    let first = true;
    for (const id in mockNetworkMap) {
      const { daiContract, escrowContract, provider } = mockNetworkMap[id];

      mockProvider.addCallTo(mockL1DaiAddress, mockBlockEvent.blockNumber, ERC20_IFACE, "balanceOf", {
        inputs: [escrowContract],
        outputs: [first ? SUPPLY_TEST_DATA[0][0] : SUPPLY_TEST_DATA[1][0]],
      });

      provider.addCallTo(daiContract, mockBlockEvent.blockNumber, ERC20_IFACE, "totalSupply", {
        inputs: [],
        outputs: [first ? SUPPLY_TEST_DATA[0][1] : SUPPLY_TEST_DATA[1][1]],
      });
      first = false;
    }
    const findings = await handleBlock(mockBlockEvent);
    expect(findings).toStrictEqual([]);
  });

  it("returns correct findings if one L2 supply invariant is violated", async () => {
    let first = true;
    for (const id in mockNetworkMap) {
      const { daiContract, escrowContract, provider } = mockNetworkMap[id];

      mockProvider.addCallTo(mockL1DaiAddress, mockBlockEvent.blockNumber, ERC20_IFACE, "balanceOf", {
        inputs: [escrowContract],
        outputs: [first ? SUPPLY_TEST_DATA[0][0] : SUPPLY_TEST_DATA[2][0]],
      });

      provider.addCallTo(daiContract, mockBlockEvent.blockNumber, ERC20_IFACE, "totalSupply", {
        inputs: [],
        outputs: [first ? SUPPLY_TEST_DATA[0][1] : SUPPLY_TEST_DATA[2][1]],
      });
      first = false;
    }
    const findings = await handleBlock(mockBlockEvent);
    expect(findings).toStrictEqual([
      expect.objectContaining(
        createTestFinding(MOCK_L2_DATA_TWO["chainId"], MOCK_L2_DATA_TWO["chainName"], [
          SUPPLY_TEST_DATA[2][0],
          SUPPLY_TEST_DATA[2][1],
        ])
      ),
    ]);
  });

  it("returns correct findings if both L2 supply invariants are violated", async () => {
    let first = true;
    for (const id in mockNetworkMap) {
      const { daiContract, escrowContract, provider } = mockNetworkMap[id];

      mockProvider.addCallTo(mockL1DaiAddress, mockBlockEvent.blockNumber, ERC20_IFACE, "balanceOf", {
        inputs: [escrowContract],
        outputs: [first ? SUPPLY_TEST_DATA[2][0] : SUPPLY_TEST_DATA[3][0]],
      });

      provider.addCallTo(daiContract, mockBlockEvent.blockNumber, ERC20_IFACE, "totalSupply", {
        inputs: [],
        outputs: [first ? SUPPLY_TEST_DATA[2][1] : SUPPLY_TEST_DATA[3][1]],
      });
      first = false;
    }
    const findings = await handleBlock(mockBlockEvent);
    expect(findings).toStrictEqual([
      expect.objectContaining(
        createTestFinding(MOCK_L2_DATA_ONE["chainId"], MOCK_L2_DATA_ONE["chainName"], [
          SUPPLY_TEST_DATA[2][0],
          SUPPLY_TEST_DATA[2][1],
        ])
      ),
      expect.objectContaining(
        createTestFinding(MOCK_L2_DATA_TWO["chainId"], MOCK_L2_DATA_TWO["chainName"], [
          SUPPLY_TEST_DATA[3][0],
          SUPPLY_TEST_DATA[3][1],
        ])
      ),
    ]);
  });
});
