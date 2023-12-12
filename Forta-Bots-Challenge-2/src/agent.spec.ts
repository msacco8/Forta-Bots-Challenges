import { HandleTransaction } from "forta-agent";
import { provideHandleTransaction } from "./agent";
import { READ_FACTORY_ABI, SWAP_EVENT } from "./constants";
import { MockEthersProvider, TestTransactionEvent } from "forta-agent-tools/lib/test";
import { createAddress } from "forta-agent-tools";
import { Interface } from "ethers/lib/utils";
import { createFinding } from "./findings";
import { BigNumber } from "ethers";

// format [block, poolAddress]
const TEST_CALL_DATA: [number, string][] = [
  [10, createAddress("0xee5")],
  [20, createAddress("0xfe6")],
  [30, createAddress("0xfe7")],
  [40, createAddress("0xfe8")],
  [50, createAddress("0xfe9")],
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

describe("uniswap v3 swap detection", () => {
  let handleTransaction: HandleTransaction;
  let mockTxEvent = new TestTransactionEvent();
  const mockProvider: MockEthersProvider = new MockEthersProvider();
  const mockUniswapFactory = createAddress("0x01");
  const READ_FACTORY_IFACE = new Interface(READ_FACTORY_ABI);
  const INCORRECT_IFACE = new Interface(["function foo() external view returns (address)"]);

  beforeAll(() => {
    handleTransaction = provideHandleTransaction(SWAP_EVENT, mockUniswapFactory, mockProvider as any);
  });

  beforeEach(() => {
    mockTxEvent = new TestTransactionEvent();
  });

  it("returns empty findings if there is an empty txEvent", async () => {
    const findings = await handleTransaction(mockTxEvent);
    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there is a swap event not on Uniswap V3", async () => {
    const wrongFactoryAddress = createAddress("0x05");
    const [block, poolAddress] = TEST_CALL_DATA[0];

    mockProvider.addCallTo(poolAddress, block, READ_FACTORY_IFACE, "factory", {
      inputs: [],
      outputs: [wrongFactoryAddress],
    });

    mockTxEvent.setBlock(block).addEventLog(SWAP_EVENT, poolAddress, TEST_LOGS[0]);

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there is no factory function on pool contract", async () => {
    const [block, poolAddress] = TEST_CALL_DATA[0];

    mockProvider.addCallTo(poolAddress, block, INCORRECT_IFACE, "foo", {
      inputs: [],
      outputs: [mockUniswapFactory],
    });

    mockTxEvent.setBlock(block).addEventLog(SWAP_EVENT, poolAddress, TEST_LOGS[0]);

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([]);
  });

  it("returns correct findings if there is one swap on Uniswap V3", async () => {
    const [block, poolAddress] = TEST_CALL_DATA[0];

    mockProvider.addCallTo(poolAddress, block, READ_FACTORY_IFACE, "factory", {
      inputs: [],
      outputs: [mockUniswapFactory],
    });

    mockTxEvent.setBlock(block).addEventLog(SWAP_EVENT, poolAddress, TEST_LOGS[0]);

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([createFinding(TEST_LOGS[0], poolAddress)]);
  });

  it("returns correct findings if there are multiple swaps from multiple pools on Uniswap V3", async () => {
    const [blockOne, poolAddressOne] = TEST_CALL_DATA[1];
    const [blockTwo, poolAddressTwo] = TEST_CALL_DATA[2];
    mockProvider.addCallTo(poolAddressOne, blockOne, READ_FACTORY_IFACE, "factory", {
      inputs: [],
      outputs: [mockUniswapFactory],
    });

    mockTxEvent
      .setBlock(blockOne)
      .addEventLog(SWAP_EVENT, poolAddressOne, TEST_LOGS[0])
      .addEventLog(SWAP_EVENT, poolAddressOne, TEST_LOGS[1]);

    const findingsOne = await handleTransaction(mockTxEvent);

    mockProvider.addCallTo(poolAddressTwo, blockTwo, READ_FACTORY_IFACE, "factory", {
      inputs: [],
      outputs: [mockUniswapFactory],
    });

    mockTxEvent.setBlock(blockTwo).addEventLog(SWAP_EVENT, poolAddressTwo, TEST_LOGS[2]);

    const findingsTwo = await handleTransaction(mockTxEvent);

    expect(findingsOne.concat(findingsTwo)).toStrictEqual([
      createFinding(TEST_LOGS[0], poolAddressOne),
      createFinding(TEST_LOGS[1], poolAddressOne),
      createFinding(TEST_LOGS[2], poolAddressTwo),
    ]);
  });
});
