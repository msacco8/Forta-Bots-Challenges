import { CollateralAddresses, FetcherConfig } from "./agent.utils";
import { BigNumber } from "ethers";

export const BASE_ASSET_USDC: string = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const BASE_ASSET_WETH: string = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const COMET_ADDRESS_USDC: string = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
export const COMET_ADDRESS_WETH: string = "0xA17581A9E3356d9A858b789D68B4d866e593aE94";
export const BORROW_CALL_NAMES: string[] = [
  "withdraw",
  "withdrawTo",
  "withdrawFrom",
  "supply",
  "supplyTo",
  "supplyFrom",
];
export const BORROW_THRESHOLD_USDC: BigNumber = BigNumber.from(10000);
export const BORROW_THRESHOLD_WETH: BigNumber = BigNumber.from(10);
export const MAX_POSITIONS_USDC: number = 100;
export const MAX_POSITIONS_WETH: number = 100;
export const USDC_COLLATERAL_TOKENS: CollateralAddresses = {
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  COMP: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
};
export const WETH_COLLATERAL_TOKENS: CollateralAddresses = {
  wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  cbETH: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
  rETH: "0xae78736Cd615f374D3085123A210448E74Fc6393",
};

export const FETCHER_CONFIG_USDC: FetcherConfig = {
  cometAddress: COMET_ADDRESS_USDC,
  baseAssetAddress: BASE_ASSET_USDC,
  collateralAddresses: USDC_COLLATERAL_TOKENS,
  borrowThreshold: BORROW_THRESHOLD_USDC,
  maxPositions: MAX_POSITIONS_USDC,
};
export const FETCHER_CONFIG_WETH: FetcherConfig = {
  cometAddress: COMET_ADDRESS_WETH,
  baseAssetAddress: BASE_ASSET_WETH,
  collateralAddresses: WETH_COLLATERAL_TOKENS,
  borrowThreshold: BORROW_THRESHOLD_WETH,
  maxPositions: MAX_POSITIONS_WETH,
};

export const ERC20_ABI: string[] = ["function balanceOf(address) external view returns (uint256)"];
export const COMET_ABI: string[] = [
  "function isLiquidatable(address) public view returns (bool)",
  "function borrowBalanceOf(address) public view returns (uint256)",
  "function quoteCollateral(address, uint) public view returns (uint)",
];

export const COMET_SIGNATURES: string[] = [
  "function withdraw(address, uint) external",
  "function withdrawTo(address, address, uint) external",
  "function withdrawFrom(address, address, address, uint) external",
  "function supply(address, uint) external",
  "function supplyTo(address, address, uint) external",
  "function supplyFrom(address, address, address, uint) external",
];
