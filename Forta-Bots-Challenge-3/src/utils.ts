import { Finding, getAlerts, sendAlerts } from "forta-agent";
import { providers, Contract, BigNumber } from "ethers";
import { createEscrowBalanceFinding, createFinding } from "./finding";
import { agentId } from "../forta.config.json";
import { ERC20_ABI } from "./constants";

const chainNames = {
  1: "Ethereum",
  10: "Optimism",
  42161: "Arbitrum",
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
  arbitrumEscrow: string
) => {
  const l1DaiContract = new Contract(l1DaiAddress, ERC20_ABI, provider);

  // call L1 DAI contract to get balances of each L2's escrow contract
  const optimismEscrowBalance = await l1DaiContract.balanceOf(optimismEscrow, { blockTag: blockNumber });
  const arbitrumEscrowBalance = await l1DaiContract.balanceOf(arbitrumEscrow, { blockTag: blockNumber });

  // create finding
  const escrowBalanceFinding = createEscrowBalanceFinding(
    blockNumber.toString(),
    optimismEscrowBalance,
    arbitrumEscrowBalance
  );

  // send alert containing previously declared finding
  sendAlerts({
    botId: agentId,
    finding: escrowBalanceFinding,
  });
};

export const checkInvariant = async (
  provider: providers.Provider,
  blockNumber: number,
  findings: Finding[],
  chainId: number,
  l1DaiAddress: string
) => {
  // create contract instance based on L2 chain bot is currently running on
  let l2DaiContract: Contract;
  if (chainId === 10) {
    l2DaiContract = new Contract(l1DaiAddress, ERC20_ABI, provider);
  } else if (chainId === 42161) {
    l2DaiContract = new Contract(l1DaiAddress, ERC20_ABI, provider);
  } else {
    throw new Error("You are running the bot in a non supported network");
  }

  // get DAI supply for L2 bot is running on
  const l2DaiSupply = await l2DaiContract.totalSupply({ blockTag: blockNumber });

  // query alerts from L1 side of the bot to get escrow balances
  const getEscrowBalanceAlert = await getAlerts({
    botIds: [agentId],
    alertId: "NETHERMIND-5",
  });

  // compare escrow balances with L2 DAI supply and ensure latest L1 block is used
  if (getEscrowBalanceAlert.alerts.length !== 0) {
    let latestBlock = 0;
    let latestAlertIndex = 0;

    for (let i = 0; i < getEscrowBalanceAlert.alerts.length; i++) {
      let alert = getEscrowBalanceAlert.alerts[i];
      let blockNumber = parseInt(alert.metadata.blockNumber);
      if (blockNumber > latestBlock) {
        latestBlock = blockNumber;
        latestAlertIndex = i;
      }
    }

    const l1EscrowBalance =
      chainId === 10
        ? getEscrowBalanceAlert.alerts[latestAlertIndex].metadata.optimismBalance
        : getEscrowBalanceAlert.alerts[latestAlertIndex].metadata.arbitrumBalance;

    if (l2DaiSupply.lt(BigNumber.from(l1EscrowBalance))) {
      findings.push(createFinding(chainId, chainNames[chainId], [l1EscrowBalance, l2DaiSupply]));
    }
  }
};
