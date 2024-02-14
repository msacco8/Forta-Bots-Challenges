import { Finding, FindingSeverity, FindingType } from "forta-agent";
import { Liquidatable, PositionData } from "./agent.utils";

export const createNewPositionFinding = (baseAssetAddresses: string[], newPosition: PositionData) => {
  const newPositionToken = newPosition.token.toLowerCase();
  const newPositionOwner = newPosition.owner.toLowerCase();
  const newPositionBaseAsset = newPositionToken === baseAssetAddresses[0].toLowerCase() ? "USDC" : "WETH";
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

export const createLiquidatableFinding = (baseAssetAddresses: string[], liquidatablePosition: Liquidatable) => {
  const liquidatablePositionToken = liquidatablePosition.position.token.toLowerCase();
  const liquidatablePositionOwner = liquidatablePosition.position.owner.toLowerCase();
  const liquidatablePositionBaseAsset =
    liquidatablePositionToken === baseAssetAddresses[0].toLowerCase() ? "USDC" : "WETH";
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
