import { MockEthersProvider } from "forta-agent-tools/lib/test";
import { createAddress } from "forta-agent-tools";
import { READ_FACTORY_ABI } from "./constants";
import FactoryFetcher from "./factory.fetcher";
import { Interface } from "ethers/lib/utils";

// format: [blockNumber, module,  balance]
const TEST_DATA_1: [number, string, string][] = [
  [10, createAddress("0xae1"), createAddress("0xee5")],
  [20, createAddress("0xbe2"), createAddress("0xfe6")],
  [30, createAddress("0xae2"), createAddress("0xfe7")],
  [40, createAddress("0xce3"), createAddress("0xfe8")],
  [50, createAddress("0xde4"), createAddress("0xfe9")],
];

describe("FactoryFetcher test suite", () => {
  const READ_FACTORY_IFACE = new Interface(READ_FACTORY_ABI);
  const INCORRECT_IFACE = new Interface(["function foo() external view returns (address)"]);
  const mockProvider: MockEthersProvider = new MockEthersProvider();
  const fetcher: FactoryFetcher = new FactoryFetcher(mockProvider as any);

  beforeEach(() => mockProvider.clear());

  it("should return null if pool contract does not have a read method for factory", async () => {
    const block = 10;
    const poolAddress = createAddress("0xae3");
    const fakeFactoryAddress = createAddress("0xae4");

    mockProvider.addCallTo(poolAddress, block, INCORRECT_IFACE, "foo", {
      inputs: [],
      outputs: [fakeFactoryAddress],
    });

    const fetchedFactory = await fetcher.getFactory(poolAddress, block);

    expect(fetchedFactory).toStrictEqual(null);
  });

  it("should fetch factory address and use cache correctly", async () => {
    for (let [block, poolAddress, factoryAddress] of TEST_DATA_1) {
      mockProvider.addCallTo(poolAddress, block, READ_FACTORY_IFACE, "factory", {
        inputs: [],
        outputs: [factoryAddress],
      });

      const fetchedFactory = await fetcher.getFactory(poolAddress, block);

      expect(fetchedFactory).toStrictEqual(factoryAddress);
    }

    // clear mock to use cache
    mockProvider.clear();
    for (let [block, poolAddress, factoryAddress] of TEST_DATA_1) {
      const fetchedFactory = await fetcher.getFactory(poolAddress, block);

      expect(fetchedFactory).toStrictEqual(factoryAddress);
    }
  });
});
