import { HandleTransaction, Initialize, Finding, FindingType, FindingSeverity, HandleBlock } from "forta-agent";
import { provideHandleTransaction, provideInitialize, provideHandleBlock } from "./agent";
import { MockEthersProvider, TestBlockEvent, TestTransactionEvent } from "forta-agent-tools/lib/test";
import { createAddress } from "forta-agent-tools";
import { Interface } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import {
  CollateralAddresses,
  PositionData,
  emptyPositionData,
  Liquidatable,
  FetcherConfig,
  CollateralQuotes,
  CollateralBalances,
} from "./agent.utils";

const createTestNewPositionFinding = (newPosition: PositionData) => {
  const newPositionToken = newPosition.token.toLowerCase();
  const newPositionOwner = newPosition.owner.toLowerCase();
  const newPositionBaseAsset = newPositionToken === mockBaseUSDC.toLowerCase() ? "USDC" : "WETH";
  return Finding.fromObject({
    name: `Compound III Mainnet ${newPositionBaseAsset} New Tracked Position`,
    description: `Account ${newPositionOwner} on Compound III's Mainnet ${newPositionBaseAsset} instance opened or updated a position`,
    alertId: "COMPIII-POSITION",
    severity: FindingSeverity.Low,
    type: FindingType.Info,
    metadata: {
      accountOwner: newPosition.owner,
    },
  });
};

const createTestLiquidatableFinding = (liquidatablePosition: Liquidatable) => {
  const liquidatablePositionToken = liquidatablePosition.position.token.toLowerCase();
  const liquidatablePositionOwner = liquidatablePosition.position.owner.toLowerCase();
  const liquidatablePositionBaseAsset = liquidatablePositionToken === mockBaseUSDC.toLowerCase() ? "USDC" : "WETH";
  return Finding.fromObject({
    name: `Compound III Mainnet ${liquidatablePositionBaseAsset} Liquidatable Position`,
    description: `Account ${liquidatablePositionOwner} on Compound III's Mainnet ${liquidatablePositionBaseAsset} instance is liquidatable`,
    alertId: "COMPIII-LIQUID",
    severity: FindingSeverity.High,
    type: FindingType.Info,
    metadata: {
      accountOwner: liquidatablePositionOwner,
      balance: liquidatablePosition.borrowBalance.toString(),
      collateralBalances: JSON.stringify(liquidatablePosition.collateralBalances),
      collateralQuotes: JSON.stringify(liquidatablePosition.collateralQuotes),
    },
  });
};

const createCollateralObject = (baseAsset: string, values: string[]): CollateralQuotes | CollateralBalances => {
  return baseAsset === "USDC"
    ? {
        WBTC: values[0],
        WETH: values[1],
        COMP: values[2],
        UNI: values[3],
        LINK: values[4],
      }
    : {
        wstETH: values[0],
        cbETH: values[1],
        rETH: values[2],
      };
};

const mockCallSignatures: string[] = ["withdraw", "withdrawTo", "withdrawFrom", "supply", "supplyTo", "supplyFrom"];

const mockBorrowThresholdUSDC: BigNumber = BigNumber.from(50);
const mockBorrowThresholdWETH: BigNumber = BigNumber.from(5);

const mockCometAddressUSDC: string = createAddress("0xa1");
const mockCometAddressWETH: string = createAddress("0xa2");

const mockBaseUSDC: string = createAddress("0xa3");
const mockBaseWETH: string = createAddress("0xa4");

const mockERC20ABI: string[] = ["function balanceOf(address) external view returns (uint256)"];
const mockCometABI: string[] = [
  "function isLiquidatable(address) public view returns (bool)",
  "function borrowBalanceOf(address) public view returns (uint256)",
  "function quoteCollateral(address, uint) public view returns (uint)",
];
const mockCometSignatures: string[] = [
  "function withdraw(address, uint) external",
  "function withdrawTo(address, address, uint) external",
  "function withdrawFrom(address, address, address, uint) external",
  "function supply(address, uint) external",
  "function supplyTo(address, address, uint) external",
  "function supplyFrom(address, address, address, uint) external",
];

const mockERC20IFACE: Interface = new Interface(mockERC20ABI);
const mockCometIFACE: Interface = new Interface(mockCometABI);
const mockCometSignaturesIFACE: Interface = new Interface(mockCometSignatures);

const mockCollateralUSDC: CollateralAddresses = {
  WBTC: createAddress("0xb1"),
  WETH: createAddress("0xb2"),
  COMP: createAddress("0xb3"),
  UNI: createAddress("0xb4"),
  LINK: createAddress("0xb5"),
};
const mockCollateralWETH: CollateralAddresses = {
  wstETH: createAddress("0xc1"),
  cbETH: createAddress("0xc2"),
  rETH: createAddress("0xc3"),
};

const mockFetcherConfigUSDC: FetcherConfig = {
  cometAddress: mockCometAddressUSDC,
  baseAssetAddress: mockBaseUSDC,
  collateralAddresses: mockCollateralUSDC,
  borrowThreshold: mockBorrowThresholdUSDC,
  maxPositions: 5,
};
const mockFetcherConfigWETH: FetcherConfig = {
  cometAddress: mockCometAddressWETH,
  baseAssetAddress: mockBaseWETH,
  collateralAddresses: mockCollateralWETH,
  borrowThreshold: mockBorrowThresholdWETH,
  maxPositions: 5,
};

const mockSenders: string[] = [
  createAddress("0xd1"),
  createAddress("0xd2"),
  createAddress("0xd3"),
  createAddress("0xd4"),
  createAddress("0xd5"),
  createAddress("0xd6"),
];

const mockSendees: string[] = [
  createAddress("0xe1"),
  createAddress("0xe2"),
  createAddress("0xe3"),
  createAddress("0xe4"),
];

const mockManaged: string[] = [createAddress("0xf1"), createAddress("0xf2")];

describe("Comp III Position Tracker Test Suite", () => {
  let handleTransaction: HandleTransaction;
  let handleBlock: HandleBlock;
  let initialize: Initialize;
  let mockTxEvent = new TestTransactionEvent();
  let mockBlockEvent = new TestBlockEvent();
  const mockProvider: MockEthersProvider = new MockEthersProvider();

  const getFindingFromTxData = (
    from: string,
    to: string,
    fnName: string,
    fnArgs: any[],
    blockNumber: number,
    borrowBalance: number,
    managedAccount: string
  ) => {
    mockTxEvent = new TestTransactionEvent();
    mockTxEvent
      .setFrom(from)
      .setTo(to)
      .setBlock(blockNumber)
      .addTraces({
        function: mockCometSignaturesIFACE.getFunction(fnName),
        from,
        to,
        arguments: fnArgs,
      });
    const borrowAddress: string = fnName === "supplyFrom" || fnName === "withdrawFrom" ? managedAccount! : from;
    mockProvider.addCallTo(to, 10, mockCometIFACE, "borrowBalanceOf", {
      inputs: [borrowAddress],
      outputs: [BigNumber.from(borrowBalance)],
    });
    return handleTransaction(mockTxEvent);
  };

  const mockLiquidatableCalls = (
    baseAsset: string,
    blockNumber: number,
    borrower: string,
    isLiquidatable: boolean,
    borrowBalance: number,
    collateralBalances: number[],
    collateralQuotes: number[]
  ) => {
    const collateralTokens: CollateralAddresses = baseAsset === "USDC" ? mockCollateralUSDC : mockCollateralWETH;
    const cometAddress: string = baseAsset === "USDC" ? mockCometAddressUSDC : mockCometAddressWETH;
    mockProvider.addCallTo(cometAddress, blockNumber, mockCometIFACE, "isLiquidatable", {
      inputs: [borrower],
      outputs: [isLiquidatable],
    });

    mockProvider.addCallTo(cometAddress, blockNumber, mockCometIFACE, "borrowBalanceOf", {
      inputs: [borrower],
      outputs: [BigNumber.from(borrowBalance)],
    });
    let index = 0;
    for (const token in collateralTokens) {
      mockProvider.addCallTo(collateralTokens[token], blockNumber, mockERC20IFACE, "balanceOf", {
        inputs: [borrower],
        outputs: [BigNumber.from(collateralBalances[index])],
      });
      mockProvider.addCallTo(cometAddress, blockNumber, mockCometIFACE, "quoteCollateral", {
        inputs: [collateralTokens[token], 1],
        outputs: [collateralQuotes[index]],
      });
      index += 1;
    }
  };

  beforeAll(() => {
    handleTransaction = provideHandleTransaction(mockCometSignatures);
    handleBlock = provideHandleBlock();
  });

  beforeEach(async () => {
    initialize = provideInitialize(
      mockProvider as any,
      mockFetcherConfigUSDC,
      mockFetcherConfigWETH,
      mockERC20ABI,
      mockCometABI,
      mockCallSignatures
    );
    await initialize();
    mockTxEvent = new TestTransactionEvent();
    mockBlockEvent = new TestBlockEvent();
  });

  it("returns empty findings if there is an empty txEvent", async () => {
    const transactionFindings = await handleTransaction(mockTxEvent);
    const blockFindings = await handleBlock(mockBlockEvent);
    expect(transactionFindings).toStrictEqual([]);
    expect(blockFindings).toStrictEqual([]);
  });

  it("returns empty findings if there are supply and withdraw transactions that don't interact with Comp III", async () => {
    const mockWrongContract: string = createAddress("0x01");
    const mockTokenAddress: string = createAddress("0x02");
    mockTxEvent
      .setFrom(mockSenders[0])
      .setTo(mockWrongContract)
      .addTraces({
        function: mockCometSignaturesIFACE.getFunction("withdraw"),
        from: mockSenders[0],
        to: mockWrongContract,
        arguments: [mockTokenAddress, 1],
      })
      .addTraces({
        function: mockCometSignaturesIFACE.getFunction("supply"),
        from: mockSenders[0],
        to: mockWrongContract,
        arguments: [mockTokenAddress, 1],
      });

    const transactionFindings = await handleTransaction(mockTxEvent);
    const blockFindings = await handleBlock(mockBlockEvent);
    expect(transactionFindings).toStrictEqual([]);
    expect(blockFindings).toStrictEqual([]);
  });

  it("returns empty transaction findings if there are calls to each supply method that don't indicate a new/updated position", async () => {
    // sender, blockNumber, addressTo, functionName, functionArgs, borrowBalanceOutput, managedAccount if needed, expected Position
    const supplyFromArgs = [
      [mockManaged[0], mockSendees[1], mockBaseUSDC, 1],
      [mockManaged[1], mockSendees[3], mockBaseWETH, 1],
    ];

    const supplyCallTest = [
      [mockSenders[0], mockCometAddressUSDC, "supply", [mockBaseUSDC, 1], 10, 10, ""],
      [mockSenders[1], mockCometAddressUSDC, "supplyTo", [mockSendees[0], mockBaseUSDC, 1], 10, 10, ""],
      [mockSenders[2], mockCometAddressUSDC, "supplyFrom", supplyFromArgs[0], 10, 0, mockManaged[0]],
      [mockSenders[3], mockCometAddressWETH, "supply", [mockBaseWETH, 1], 10, 2, ""],
      [mockSenders[4], mockCometAddressWETH, "supplyTo", [mockSendees[2], mockBaseWETH, 1], 10, 2, ""],
      [mockSenders[5], mockCometAddressWETH, "supplyFrom", supplyFromArgs[1], 10, 0, mockManaged[1]],
    ];

    for (const [index, [from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc]] of supplyCallTest.entries()) {
      //@ts-ignore
      const findings = await getFindingFromTxData(from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc);
      expect(findings).toStrictEqual([]);
    }
  });

  it("returns correct transaction findings if there are calls to each supply method that indicate a new/updated position", async () => {
    // sender, blockNumber, addressTo, functionName, functionArgs, borrowBalanceOutput, managedAccount if needed, expected Position
    const supplyFromArgs = [
      [mockManaged[0], mockSendees[1], mockBaseUSDC, 1],
      [mockManaged[1], mockSendees[3], mockBaseWETH, 1],
    ];

    const supplyCallTest = [
      [mockSenders[0], mockCometAddressUSDC, "supply", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[1], mockCometAddressUSDC, "supplyTo", [mockSendees[0], mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[2], mockCometAddressUSDC, "supplyFrom", supplyFromArgs[0], 10, 60, mockManaged[0]],
      [mockSenders[3], mockCometAddressWETH, "supply", [mockBaseWETH, 1], 10, 6, ""],
      [mockSenders[4], mockCometAddressWETH, "supplyTo", [mockSendees[2], mockBaseWETH, 1], 10, 6, ""],
      [mockSenders[5], mockCometAddressWETH, "supplyFrom", supplyFromArgs[1], 10, 6, mockManaged[1]],
    ];

    const supplyPositionTest = [
      { owner: mockSenders[0], token: mockBaseUSDC },
      { owner: mockSenders[1], token: mockBaseUSDC },
      { owner: mockManaged[0], token: mockBaseUSDC },
      { owner: mockSenders[3], token: mockBaseWETH },
      { owner: mockSenders[4], token: mockBaseWETH },
      { owner: mockManaged[1], token: mockBaseWETH },
    ];

    for (const [index, [from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc]] of supplyCallTest.entries()) {
      //@ts-ignore
      const findings = await getFindingFromTxData(from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc);
      const expected =
        supplyPositionTest[index] === emptyPositionData
          ? []
          : [createTestNewPositionFinding(supplyPositionTest[index])];
      expect(findings).toStrictEqual(expected);
    }
  });

  it("returns correct transaction findings if there are calls to each withdraw method that indicate a new/updated position", async () => {
    // sender, blockNumber, addressTo, functionName, functionArgs, borrowBalanceOutput, managedAccount if needed, expected Position
    const withdrawFromArgs = [
      [mockManaged[0], mockSendees[1], mockBaseUSDC, 1],
      [mockManaged[1], mockSendees[3], mockBaseWETH, 1],
    ];

    const supplyCallTest = [
      [mockSenders[0], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[1], mockCometAddressUSDC, "withdrawTo", [mockSendees[0], mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[2], mockCometAddressUSDC, "withdrawFrom", withdrawFromArgs[0], 10, 60, mockManaged[0]],
      [mockSenders[3], mockCometAddressWETH, "withdraw", [mockBaseWETH, 1], 10, 6, ""],
      [mockSenders[4], mockCometAddressWETH, "withdrawTo", [mockSendees[2], mockBaseWETH, 1], 10, 6, ""],
      [mockSenders[5], mockCometAddressWETH, "withdrawFrom", withdrawFromArgs[1], 10, 6, mockManaged[1]],
    ];

    const supplyPositionTest = [
      { owner: mockSenders[0], token: mockBaseUSDC },
      { owner: mockSenders[1], token: mockBaseUSDC },
      { owner: mockManaged[0], token: mockBaseUSDC },
      { owner: mockSenders[3], token: mockBaseWETH },
      { owner: mockSenders[4], token: mockBaseWETH },
      { owner: mockManaged[1], token: mockBaseWETH },
    ];

    for (const [index, [from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc]] of supplyCallTest.entries()) {
      //@ts-ignore
      const findings = await getFindingFromTxData(from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc);
      const expected =
        supplyPositionTest[index] === emptyPositionData
          ? []
          : [createTestNewPositionFinding(supplyPositionTest[index])];
      expect(findings).toStrictEqual(expected);
    }
  });

  it("returns empty block findings if there are no liquidatable positions on either comet instance", async () => {
    // sender, blockNumber, addressTo, functionName, functionArgs, borrowBalanceOutput, managedAccount if needed, expected Position
    const supplyCallTest = [
      [mockSenders[0], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[1], mockCometAddressWETH, "withdraw", [mockBaseWETH, 1], 10, 6, ""],
    ];

    for (const [from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc] of supplyCallTest) {
      //@ts-ignore
      await getFindingFromTxData(from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc);
    }

    mockProvider.addCallTo(mockCometAddressUSDC, 11, mockCometIFACE, "isLiquidatable", {
      inputs: [mockSenders[0]],
      outputs: [false],
    });
    mockProvider.addCallTo(mockCometAddressWETH, 11, mockCometIFACE, "isLiquidatable", {
      inputs: [mockSenders[1]],
      outputs: [false],
    });

    mockBlockEvent.setNumber(11);

    const blockFindings = await handleBlock(mockBlockEvent);
    expect(blockFindings).toStrictEqual([]);
  });

  it("returns correct block findings if there are liquidatable positions on both comet instances", async () => {
    const positionTestCalls = [
      [mockSenders[0], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[1], mockCometAddressWETH, "withdraw", [mockBaseWETH, 1], 10, 6, ""],
    ];

    const positionTestData = [
      { owner: mockSenders[0], token: mockBaseUSDC },
      { owner: mockSenders[1], token: mockBaseWETH },
    ];

    const liquidatableTestCalls = [
      ["USDC", 11, mockSenders[0], true, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
      ["WETH", 11, mockSenders[1], true, 6, [2, 2, 2], [3, 3, 3]],
    ];

    for (const [from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc] of positionTestCalls) {
      //@ts-ignore
      await getFindingFromTxData(from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc);
    }

    for (const [baseAsset, block, borrower, isLiq, borrowBal, collatBals, collatQuotes] of liquidatableTestCalls) {
      //@ts-ignore
      await mockLiquidatableCalls(baseAsset, block, borrower, isLiq, borrowBal, collatBals, collatQuotes);
    }

    const mockTestLiquidation: Liquidatable[] = [
      {
        position: positionTestData[0],
        isLiquidatable: true,
        borrowBalance: BigNumber.from(60),
        collateralBalances: createCollateralObject("USDC", ["2", "2", "2", "2", "2"]),
        collateralQuotes: createCollateralObject("USDC", ["3", "3", "3", "3", "3"]),
      },
      {
        position: positionTestData[1],
        isLiquidatable: true,
        borrowBalance: BigNumber.from(6),
        collateralBalances: createCollateralObject("WETH", ["2", "2", "2"]),
        collateralQuotes: createCollateralObject("WETH", ["3", "3", "3"]),
      },
    ];

    const expected: Finding[] = [
      createTestLiquidatableFinding(mockTestLiquidation[0]),
      createTestLiquidatableFinding(mockTestLiquidation[1]),
    ];

    mockBlockEvent.setNumber(11);

    const blockFindings = await handleBlock(mockBlockEvent);

    expect(blockFindings).toEqual(expect.arrayContaining(expected));
    expect(blockFindings.length).toEqual(expected.length);
  });

  it("returns correct block findings if there are liquidatable and non-liquidatable positions on both comet instances", async () => {
    const positionTestCalls = [
      [mockSenders[0], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[1], mockCometAddressWETH, "supply", [mockBaseWETH, 1], 10, 6, ""],
      [mockSenders[2], mockCometAddressUSDC, "supplyTo", [mockSendees[0], mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[3], mockCometAddressWETH, "withdrawTo", [mockSendees[1], mockBaseWETH, 1], 10, 6, ""],
    ];

    const positionTestData = [
      { owner: mockSenders[0], token: mockBaseUSDC },
      { owner: mockSenders[1], token: mockBaseWETH },
    ];

    const liquidatableTestCalls = [
      ["USDC", 11, mockSenders[0], true, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
      ["WETH", 11, mockSenders[1], true, 6, [2, 2, 2], [3, 3, 3]],
      ["USDC", 11, mockSenders[2], false, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
      ["WETH", 11, mockSenders[3], false, 6, [2, 2, 2], [3, 3, 3]],
    ];

    for (const [from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc] of positionTestCalls) {
      //@ts-ignore
      await getFindingFromTxData(from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc);
    }

    for (const [baseAsset, block, borrower, isLiq, borrowBal, collatBals, collatQuotes] of liquidatableTestCalls) {
      //@ts-ignore
      await mockLiquidatableCalls(baseAsset, block, borrower, isLiq, borrowBal, collatBals, collatQuotes);
    }

    const mockTestLiquidation: Liquidatable[] = [
      {
        position: positionTestData[0],
        isLiquidatable: true,
        borrowBalance: BigNumber.from(60),
        collateralBalances: createCollateralObject("USDC", ["2", "2", "2", "2", "2"]),
        collateralQuotes: createCollateralObject("USDC", ["3", "3", "3", "3", "3"]),
      },
      {
        position: positionTestData[1],
        isLiquidatable: true,
        borrowBalance: BigNumber.from(6),
        collateralBalances: createCollateralObject("WETH", ["2", "2", "2"]),
        collateralQuotes: createCollateralObject("WETH", ["3", "3", "3"]),
      },
    ];

    const expected: Finding[] = [
      createTestLiquidatableFinding(mockTestLiquidation[0]),
      createTestLiquidatableFinding(mockTestLiquidation[1]),
    ];

    mockBlockEvent.setNumber(11);

    const blockFindings = await handleBlock(mockBlockEvent);

    expect(blockFindings).toEqual(expect.arrayContaining(expected));
    expect(blockFindings.length).toEqual(expected.length);
  });

  it("returns empty block findings if a recently added liquidatable position is replaced by a non-liquidatable position", async () => {
    const positionTestCalls = [
      [mockSenders[0], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[1], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[2], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[3], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[4], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
      [mockSenders[5], mockCometAddressUSDC, "withdraw", [mockBaseUSDC, 1], 10, 60, ""],
    ];

    const liquidatableTestCalls = [
      ["USDC", 11, mockSenders[0], false, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
      ["USDC", 11, mockSenders[1], false, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
      ["USDC", 11, mockSenders[2], false, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
      ["USDC", 11, mockSenders[3], false, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
      ["USDC", 11, mockSenders[4], true, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
      ["USDC", 11, mockSenders[5], false, 60, [2, 2, 2, 2, 2], [3, 3, 3, 3, 3]],
    ];

    for (const [from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc] of positionTestCalls) {
      //@ts-ignore
      await getFindingFromTxData(from, to, fnName, fnArgs, blockNum, borrowBal, managedAcc);
    }

    for (const [baseAsset, block, borrower, isLiq, borrowBal, collatBals, collatQuotes] of liquidatableTestCalls) {
      //@ts-ignore
      await mockLiquidatableCalls(baseAsset, block, borrower, isLiq, borrowBal, collatBals, collatQuotes);
    }

    mockBlockEvent.setNumber(11);

    const blockFindings = await handleBlock(mockBlockEvent);

    expect(blockFindings).toStrictEqual([]);
  });
});