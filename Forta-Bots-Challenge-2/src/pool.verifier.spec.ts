import { MockEthersProvider } from "forta-agent-tools/lib/test";
import { createAddress } from "forta-agent-tools";
import { BigNumber } from "ethers";
import { READ_FACTORY_ABI, UNISWAP_V3_FACTORY_ADDRESS } from "./constants";
import PoolVerifier from "./pool.verifier";
import { Interface } from "ethers/lib/utils";

// format: [blockNumber, module,  balance]
const TEST_DATA_1: [string, string][] = [
  [createAddress("0xae1"), createAddress("0xee5")],
  [createAddress("0xbe2"), createAddress("0xfe6")],
  [createAddress("0xae2"), createAddress("0xge7")],
  [createAddress("0xce3"), createAddress("0xhe8")],
  [createAddress("0xde4"), createAddress("0xie9")],
];

// // format: [blockNumber,  module,  balance]
// const TEST_DATA_2: [number, string, BigNumber][] = [
//   [10, createAddress("0xae1"), BigNumber.from(90)],
//   [20, createAddress("0xbe2"), BigNumber.from(110)],
//   [30, createAddress("0xae2"), BigNumber.from(110)],
//   [40, createAddress("0xce3"), BigNumber.from(130)],
//   [50, createAddress("0xde4"), BigNumber.from(250)],
// ];

// const factoryAddress = createAddress("0xa1");
// const wrongFactoryAddress = createAddress("0xa2");

describe("PoolVerifier test suite", () => {
  const READ_FACTORY_IFACE = new Interface(READ_FACTORY_ABI);
  const mockProvider: MockEthersProvider = new MockEthersProvider();

  const fetcher: PoolVerifier = new PoolVerifier(mockProvider as any);
  beforeEach(() => mockProvider.clear());

  it("should fetch usdc balance and use cache correctly", async () => {
    for (let [poolAddress, factoryAddress] of TEST_DATA_1) {
      mockProvider.addCallTo(READ_FACTORY_IFACE, "factory", { outputs: [factoryAddress] });

      const fetchedBalance = await fetcher.getFactory(poolAddress);
      expect(fetchedBalance).toStrictEqual(factoryAddress);
    }

    // clear mock to use cache
    mockProvider.clear();
    for (let [poolAddress, factoryAddress] of TEST_DATA_1) {
      const fetchedBalance = await fetcher.getFactory(poolAddress);
      expect(fetchedBalance).toStrictEqual(factoryAddress);
    }
  });

//   it("should fetch dydx balance and use cache correctly", async () => {
//     for (let [block, module, balance] of TEST_DATA_2) {
//       createBalanceOfCall(mockNetworkManager.dydxAddress, block, module, balance);

//       const fetchedBalance = await fetcher.getDydxBalanceOf(module, block);
//       expect(fetchedBalance).toStrictEqual(balance);
//     }

//     // clear mock to use cache
//     mockProvider.clear();
//     for (let [block, module, balance] of TEST_DATA_2) {
//       const fetchedBalance = await fetcher.getDydxBalanceOf(module, block);
//       expect(fetchedBalance).toStrictEqual(balance);
//     }
//   });

//   it("should fetch both usdc and dydx balances and use cache correctly", async () => {
//     for (let [block, module, balance] of TEST_DATA_1) {
//       createBalanceOfCall(mockNetworkManager.usdcAddress, block, module, balance);

//       const fetchedBalance = await fetcher.getUsdcBalanceOf(module, block);
//       expect(fetchedBalance).toStrictEqual(balance);
//     }

//     for (let [block, module, balance] of TEST_DATA_2) {
//       createBalanceOfCall(mockNetworkManager.dydxAddress, block, module, balance);

//       const fetchedBalance = await fetcher.getDydxBalanceOf(module, block);
//       expect(fetchedBalance).toStrictEqual(balance);
//     }

//     // clear mock to use cache
//     mockProvider.clear();
//     for (let [block, module, balance] of TEST_DATA_1) {
//       const fetchedBalance = await fetcher.getUsdcBalanceOf(module, block);
//       expect(fetchedBalance).toStrictEqual(balance);
//     }
//     for (let [block, module, balance] of TEST_DATA_2) {
//       const fetchedBalance = await fetcher.getDydxBalanceOf(module, block);
//       expect(fetchedBalance).toStrictEqual(balance);
//     }
//   });
});