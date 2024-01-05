import { Finding } from "forta-agent";
import { providers, Contract, BigNumber } from "ethers";
import { createEscrowBalanceFinding, createInvariantViolationFinding } from "./finding";
import { ERC20_ABI, BOT_ID, OPTIMISM_CHAIN_ID, ARBITRUM_CHAIN_ID, MAKER_ESCROW_ALERT_ID } from "./constants";

export type escrowBalances = {
  blockNumber: number;
  optimismEscrowBalance: BigNumber | null;
  arbitrumEscrowBalance: BigNumber | null;
};

export type contractAddresses = {
  l1DaiAddress: string;
  l2DaiAddress: string;
  optimismEscrow: string;
  arbitrumEscrow: string;
};

export const emitEscrowBalance = async (
  provider: providers.Provider,
  blockNumber: number,
  l1DaiAddress: string,
  optimismEscrow: string,
  arbitrumEscrow: string,
  prevEscrowBalance: escrowBalances,
  findings: Finding[]
) => {
  const l1DaiContract = new Contract(l1DaiAddress, ERC20_ABI, provider);

  // call L1 DAI contract to get balances of each L2's escrow contract
  const optimismEscrowBalance = await l1DaiContract.balanceOf(optimismEscrow, { blockTag: blockNumber });
  const arbitrumEscrowBalance = await l1DaiContract.balanceOf(arbitrumEscrow, { blockTag: blockNumber });

  // create and send finding only if balances are not defined or have changed since last alert
  if (
    !prevEscrowBalance ||
    prevEscrowBalance["optimismEscrowBalance"] !== optimismEscrowBalance.toString() ||
    prevEscrowBalance["arbitrumEscrowBalance"] !== arbitrumEscrowBalance.toString()
  ) {
    const escrowBalanceFinding = createEscrowBalanceFinding(
      blockNumber.toString(),
      optimismEscrowBalance,
      arbitrumEscrowBalance
    );

    findings.push(escrowBalanceFinding);
  }

  const newEscrowBalances: escrowBalances = {
    blockNumber,
    optimismEscrowBalance,
    arbitrumEscrowBalance,
  };

  return newEscrowBalances;
};

export const checkInvariant = async (
  provider: providers.Provider,
  blockNumber: number,
  findings: Finding[],
  chainId: number,
  l2DaiAddress: string,
  getAlerts: any
) => {
  // create contract instance based on L2 chain bot is currently running on
  let l2DaiContract: Contract;
  if (chainId === OPTIMISM_CHAIN_ID || chainId === ARBITRUM_CHAIN_ID) {
    l2DaiContract = new Contract(l2DaiAddress, ERC20_ABI, provider);
  } else {
    throw new Error("You are running the bot in a non supported network");
  }

  // get DAI supply for L2 bot is running on
  const l2DaiSupply = await l2DaiContract.totalSupply({ blockTag: blockNumber });

  // query alerts from L1 side of the bot to get escrow balances
  const getEscrowBalanceAlert = await getAlerts({
    botIds: [BOT_ID],
    alertId: MAKER_ESCROW_ALERT_ID,
    blockSortDirection: "desc",
    first: 1,
  });

  // compare escrow balances with L2 DAI supply and ensure latest L1 block is used
  if (getEscrowBalanceAlert.alerts.length !== 0) {
    const l1EscrowBalance =
      chainId === OPTIMISM_CHAIN_ID
        ? getEscrowBalanceAlert.alerts[0].metadata.optimismBalance
        : getEscrowBalanceAlert.alerts[0].metadata.arbitrumBalance;

    if (BigNumber.from(l1EscrowBalance).lt(l2DaiSupply)) {
      findings.push(
        createInvariantViolationFinding(chainId, chainId === OPTIMISM_CHAIN_ID ? "Optimism" : "Arbitrum", [
          l1EscrowBalance,
          l2DaiSupply,
        ])
      );
    }
  }
};
