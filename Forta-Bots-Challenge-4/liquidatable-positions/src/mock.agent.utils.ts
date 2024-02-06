import { BigNumber, Contract } from "ethers";

export type CollateralAddresses = {
  [key: string]: string;
};

export type CollateralBalances = {
  [key: string]: string;
};

export type CollateralQuotes = {
  [key: string]: string;
};

export type CollateralContracts = {
  [key: string]: Contract;
};

export type PositionData = {
  owner: string;
  token: string;
};

export type PositionDataResponse = {
  newOrUpdatedPosition: boolean;
  position: PositionData;
};

export type Liquidatable = {
  position: PositionData;
  isLiquidatable: boolean;
  borrowBalance: BigNumber;
  collateralBalances: CollateralBalances;
  collateralQuotes: CollateralQuotes;
};

export type FetcherConfig = {
  cometAddress: string;
  baseAssetAddress: string;
  collateralAddresses: CollateralAddresses;
  borrowThreshold: BigNumber;
  maxPositions: number;
};

export const emptyPositionData: PositionData = {
  owner: "",
  token: "",
};

export const emptyPositionDataResponse: PositionDataResponse = {
  newOrUpdatedPosition: false,
  position: emptyPositionData,
};

export const emptyLiquidationInfo: Liquidatable = {
  position: emptyPositionData,
  isLiquidatable: false,
  borrowBalance: BigNumber.from(0),
  collateralBalances: {},
  collateralQuotes: {},
};
