import { MockEthersProvider } from "forta-agent-tools/lib/test";
import { createAddress } from "forta-agent-tools";
import { ERC20_ABI, UNISWAP_POOL_ABI } from "./constants";
import UniswapFetcher from "./uniswap.fetcher";
import { Interface, getCreate2Address, keccak256, defaultAbiCoder, solidityKeccak256 } from "ethers/lib/utils";
import { BigNumber } from "ethers";

// format: [blockNumber, token0, token1, fee]
const TEST_DATA: [number, string, string, BigNumber][] = [
  [10, createAddress("0xaa1"), createAddress("0xbb1"), BigNumber.from(1)],
  [20, createAddress("0xaa2"), createAddress("0xbb2"), BigNumber.from(2)],
  [30, createAddress("0xaa3"), createAddress("0xbb3"), BigNumber.from(3)],
  [40, createAddress("0xaa4"), createAddress("0xbb4"), BigNumber.from(4)],
  [50, createAddress("0xaa5"), createAddress("0xbb5"), BigNumber.from(5)],
];

describe("UniswapFetcher test suite", () => {
  const UNISWAP_POOL_IFACE = new Interface(UNISWAP_POOL_ABI);
  const INCORRECT_IFACE = new Interface(["function foo() external view returns (address)"]);
  const ERC20_IFACE = new Interface(ERC20_ABI);
  const mockFactoryAddress = createAddress("0xff1");
  const mockInitCodeHash = keccak256(createAddress("0xff2"));
  const mockProvider: MockEthersProvider = new MockEthersProvider();

  let fetcher: UniswapFetcher;

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

  beforeEach(() => {
    fetcher = new UniswapFetcher(mockProvider as any, mockFactoryAddress, mockInitCodeHash);
    mockProvider.clear();
  });

  it("should return false if pool's ABI doesn't match Uniswap's pools", async () => {
    const [block, token0, token1, fee] = TEST_DATA[0];
    const poolAddress = getPoolAddress(mockFactoryAddress, mockInitCodeHash, [token0, token1, fee]);

    mockPoolCalls(poolAddress, block, INCORRECT_IFACE, [["foo", token0]]);

    mockERC20Calls(token0, token1, block);

    const poolData = await fetcher.isUniswapPool(poolAddress, block);

    expect(poolData.isUniswapPool).toStrictEqual(false);
  });

  it("should return false if pool contract was deployed by wrong factory contract", async () => {
    const wrongFactoryAddress = createAddress("0xae4");
    const wrongInitCodeHash = keccak256(createAddress("0xae5"));
    const [block, token0, token1, fee] = TEST_DATA[0];

    const poolAddress = getPoolAddress(wrongFactoryAddress, wrongInitCodeHash, [token0, token1, fee]);

    mockPoolCalls(poolAddress, block, UNISWAP_POOL_IFACE, [
      ["token0", token0],
      ["token1", token1],
      ["fee", fee],
    ]);

    mockERC20Calls(token0, token1, block);

    const poolData = await fetcher.isUniswapPool(poolAddress, block);

    expect(poolData.isUniswapPool).toStrictEqual(false);
  });

  it("should return true if pool was deployed by factory contract", async () => {
    for (let [block, token0, token1, fee] of TEST_DATA) {
      const poolAddress = getPoolAddress(mockFactoryAddress, mockInitCodeHash, [token0, token1, fee]);

      mockPoolCalls(poolAddress, block, UNISWAP_POOL_IFACE, [
        ["token0", token0],
        ["token1", token1],
        ["fee", fee],
      ]);

      mockERC20Calls(token0, token1, block);

      const poolData = await fetcher.isUniswapPool(poolAddress, block);

      expect(poolData.isUniswapPool).toStrictEqual(true);
    }

    // clear mock to use cache
    mockProvider.clear();
    for (let [block, token0, token1, fee] of TEST_DATA) {
      const poolAddress = getPoolAddress(mockFactoryAddress, mockInitCodeHash, [token0, token1, fee]);

      const poolData = await fetcher.isUniswapPool(poolAddress, block);

      expect(poolData.isUniswapPool).toStrictEqual(true);
    }
  });
});
