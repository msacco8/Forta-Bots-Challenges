import { createAddress } from "forta-agent-tools";
import { Interface } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { CollateralAddresses, FetcherConfig } from "./mock.agent.utils";

export const mockCallSignatures: string[] = [
  "withdraw",
  "withdrawTo",
  "withdrawFrom",
  "supply",
  "supplyTo",
  "supplyFrom",
];

const mockBorrowThresholdUSDC: BigNumber = BigNumber.from(50);
const mockBorrowThresholdWETH: BigNumber = BigNumber.from(5);

export const mockCometAddressUSDC: string = createAddress("0xa1");
export const mockCometAddressWETH: string = createAddress("0xa2");

export const mockBaseUSDC: string = createAddress("0xa3");
export const mockBaseWETH: string = createAddress("0xa4");

export const mockERC20ABI: string[] = ["function balanceOf(address) external view returns (uint256)"];
export const mockCometABI: string[] = [
  "function isLiquidatable(address) public view returns (bool)",
  "function borrowBalanceOf(address) public view returns (uint256)",
  "function quoteCollateral(address, uint) public view returns (uint)",
];
export const mockCometSignatures: string[] = [
  "function withdraw(address, uint) external",
  "function withdrawTo(address, address, uint) external",
  "function withdrawFrom(address, address, address, uint) external",
  "function supply(address, uint) external",
  "function supplyTo(address, address, uint) external",
  "function supplyFrom(address, address, address, uint) external",
];

export const mockERC20IFACE: Interface = new Interface(mockERC20ABI);
export const mockCometIFACE: Interface = new Interface(mockCometABI);
export const mockCometSignaturesIFACE: Interface = new Interface(mockCometSignatures);

export const mockCollateralUSDC: CollateralAddresses = {
  WBTC: createAddress("0xb1"),
  WETH: createAddress("0xb2"),
  COMP: createAddress("0xb3"),
  UNI: createAddress("0xb4"),
  LINK: createAddress("0xb5"),
};
export const mockCollateralWETH: CollateralAddresses = {
  wstETH: createAddress("0xc1"),
  cbETH: createAddress("0xc2"),
  rETH: createAddress("0xc3"),
};

export const mockFetcherConfigUSDC: FetcherConfig = {
  cometAddress: mockCometAddressUSDC,
  baseAssetAddress: mockBaseUSDC,
  collateralAddresses: mockCollateralUSDC,
  borrowThreshold: mockBorrowThresholdUSDC,
  maxPositions: 5,
};
export const mockFetcherConfigWETH: FetcherConfig = {
  cometAddress: mockCometAddressWETH,
  baseAssetAddress: mockBaseWETH,
  collateralAddresses: mockCollateralWETH,
  borrowThreshold: mockBorrowThresholdWETH,
  maxPositions: 5,
};

export const mockSenders: string[] = [
  createAddress("0xd1"),
  createAddress("0xd2"),
  createAddress("0xd3"),
  createAddress("0xd4"),
  createAddress("0xd5"),
  createAddress("0xd6"),
];

export const mockSendees: string[] = [
  createAddress("0xe1"),
  createAddress("0xe2"),
  createAddress("0xe3"),
  createAddress("0xe4"),
];

export const mockManaged: string[] = [createAddress("0xf1"), createAddress("0xf2")];
