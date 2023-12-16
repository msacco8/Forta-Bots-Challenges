import { HandleTransaction, Initialize } from "forta-agent";
import { provideHandleTransaction, provideInitialize } from "./agent";
import { UNISWAP_POOL_ABI, ERC20_ABI, SWAP_EVENT } from "./constants";
import { MockEthersProvider, TestTransactionEvent } from "forta-agent-tools/lib/test";
import { createAddress } from "forta-agent-tools";
import { Interface, defaultAbiCoder, getCreate2Address, solidityKeccak256, keccak256 } from "ethers/lib/utils";
import { createTestFinding } from "./findings";
import { BigNumber } from "ethers";
import { PoolData } from "./uniswap.fetcher";

// format: [blockNumber, token0, token1, fee]
const TEST_DATA: [number, string, string, BigNumber][] = [
  [10, createAddress("0xaa1"), createAddress("0xbb1"), BigNumber.from(1)],
  [20, createAddress("0xaa2"), createAddress("0xbb2"), BigNumber.from(2)],
  [30, createAddress("0xaa3"), createAddress("0xbb3"), BigNumber.from(3)],
];

// format: [sender,  recipient,  amount0, amount1, sqrtPriceX96, liquidity, tick]
const TEST_LOGS: [string, string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber][] = [
  [
    createAddress("0xae1"),
    createAddress("0xbe2"),
    BigNumber.from(10),
    BigNumber.from(10),
    BigNumber.from(1),
    BigNumber.from(100),
    BigNumber.from(1),
  ],
  [
    createAddress("0xae2"),
    createAddress("0xce3"),
    BigNumber.from(5),
    BigNumber.from(15),
    BigNumber.from(2),
    BigNumber.from(50),
    BigNumber.from(2),
  ],
  [
    createAddress("0xab6"),
    createAddress("0xcb5"),
    BigNumber.from(50),
    BigNumber.from(1),
    BigNumber.from(20),
    BigNumber.from(500),
    BigNumber.from(3),
  ],
];

const TEST_POOL_DATA_0: PoolData = {
  isUniswapPool: true,
  token0: "TKN0",
  token1: "TKN1",
  fee: 1,
};

const TEST_POOL_DATA_1: PoolData = {
  isUniswapPool: true,
  token0: "TKN0",
  token1: "TKN1",
  fee: 2,
};

const TEST_POOL_DATA_2: PoolData = {
  isUniswapPool: true,
  token0: "TKN0",
  token1: "TKN1",
  fee: 3,
};

describe("uniswap v3 swap detection", () => {
  let handleTransaction: HandleTransaction;
  let initialize: Initialize;
  let mockTxEvent = new TestTransactionEvent();
  const mockProvider: MockEthersProvider = new MockEthersProvider();
  const mockUniswapFactory = createAddress("0x01");
  const mockInitCodeHash = keccak256(createAddress("0x02"));
  const ERC20_IFACE = new Interface(ERC20_ABI);
  const UNISWAP_POOL_IFACE = new Interface(UNISWAP_POOL_ABI);
  const INCORRECT_IFACE = new Interface(["function foo() external view returns (address)"]);

  const getPoolAddress = (
    factoryAddress: string,
    initCodeHash: string,
    saltValues: [string, string, BigNumber]
  ): string => {
    const encoded = defaultAbiCoder.encode(["address", "address", "uint24"], saltValues);
    const salt = solidityKeccak256(["bytes"], [encoded]);
    return getCreate2Address(factoryAddress, salt, initCodeHash);
  };

  const mockPoolCalls = (poolAddress: string, block: number, iface: Interface, calls: [string, any][]) => {
    for (let [call, output] of calls) {
      mockProvider.addCallTo(poolAddress, block, iface, call, {
        inputs: [],
        outputs: [output],
      });
    }
  };

  const mockERC20Calls = (token0: string, token1: string, block: number) => {
    mockProvider.addCallTo(token0, block, ERC20_IFACE, "symbol", {
      inputs: [],
      outputs: ["TKN0"],
    });
    mockProvider.addCallTo(token1, block, ERC20_IFACE, "symbol", {
      inputs: [],
      outputs: ["TKN1"],
    });
  };

  beforeAll(() => {
    handleTransaction = provideHandleTransaction(SWAP_EVENT);
  });

  beforeEach(async () => {
    initialize = provideInitialize(mockProvider as any, mockUniswapFactory, mockInitCodeHash);
    await initialize();
    mockTxEvent = new TestTransactionEvent();
  });

  it("returns empty findings if there is an empty txEvent", async () => {
    const findings = await handleTransaction(mockTxEvent);
    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there is a swap on a pool with same tokens and fee deployed by a different factory", async () => {
    const wrongFactoryAddress = createAddress("0x03");
    const [block, token0, token1, fee] = TEST_DATA[0];

    const badPoolAddress = getPoolAddress(wrongFactoryAddress, mockInitCodeHash, [token0, token1, fee]);

    mockPoolCalls(badPoolAddress, block, UNISWAP_POOL_IFACE, [
      ["token0", token0],
      ["token1", token1],
      ["fee", fee],
    ]);

    mockERC20Calls(token0, token1, block);

    mockTxEvent.setBlock(block).addEventLog(SWAP_EVENT, badPoolAddress, TEST_LOGS[0]);

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there is a swap on a pool with incorrect ABI", async () => {
    const wrongInitCodeHash = keccak256(createAddress("0x03"));
    const [block, token0, token1, fee] = TEST_DATA[0];

    const poolAddress = getPoolAddress(mockUniswapFactory, wrongInitCodeHash, [token0, token1, fee]);

    mockPoolCalls(poolAddress, block, INCORRECT_IFACE, [["foo", token0]]);

    mockERC20Calls(token0, token1, block);

    mockTxEvent.setBlock(block).addEventLog(SWAP_EVENT, poolAddress, TEST_LOGS[0]);

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([]);
  });

  it("returns correct findings if there is one swap on Uniswap V3", async () => {
    const [block, token0, token1, fee] = TEST_DATA[0];

    const poolAddress = getPoolAddress(mockUniswapFactory, mockInitCodeHash, [token0, token1, fee]);

    mockPoolCalls(poolAddress, block, UNISWAP_POOL_IFACE, [
      ["token0", token0],
      ["token1", token1],
      ["fee", fee],
    ]);

    mockERC20Calls(token0, token1, block);

    mockTxEvent.setBlock(block).addEventLog(SWAP_EVENT, poolAddress, TEST_LOGS[0]);

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining(createTestFinding(TEST_LOGS[0], poolAddress, TEST_POOL_DATA_0)),
    ]);
  });

  it("returns correct findings if there are multiple swaps from multiple pools on Uniswap V3", async () => {
    let poolAddresses = [];
    let currentLog = 0;
    let block = 10;
    mockTxEvent.setBlock(block);
    for (let [_, token0, token1, fee] of TEST_DATA) {
      const poolAddress = getPoolAddress(mockUniswapFactory, mockInitCodeHash, [token0, token1, fee]);
      poolAddresses.push(poolAddress);

      mockPoolCalls(poolAddress, block, UNISWAP_POOL_IFACE, [
        ["token0", token0],
        ["token1", token1],
        ["fee", fee],
      ]);

      mockERC20Calls(token0, token1, block);

      mockTxEvent.addEventLog(SWAP_EVENT, poolAddress, TEST_LOGS[currentLog]);

      currentLog++;
    }

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([
      expect.objectContaining(createTestFinding(TEST_LOGS[0], poolAddresses[0], TEST_POOL_DATA_0)),
      expect.objectContaining(createTestFinding(TEST_LOGS[1], poolAddresses[1], TEST_POOL_DATA_1)),
      expect.objectContaining(createTestFinding(TEST_LOGS[2], poolAddresses[2], TEST_POOL_DATA_2)),
    ]);
  });
});
