# MakerDAO Bridge Invariant Bot

## Description

This bot detects when the MakerDAO bridge invariant is violated on Arbitrum and/or Optimism

## Supported Chains

- Ethereum
- Arbitrum
- Optimism

## Alerts

- NETHERMIND-5

  - Fired each block to emit L2 escrow balances on L1 DAI contract
  - Severity is always set to "low"
  - Type is always set to "info"
  - Metadata
    - `blockNumber`: number of the block balances are read on
    - `optimismBalance`: L1 DAI balance of Optimism's escrow contract
    - `arbitrumBalance`: L1 DAI balance of Arbitrum's escrow contract

- NETHERMIND-L2-DAI-INVARIANT
  - Fired when the supply invariant of the MakerDAO Bridge is violated on Optimism and/or Arbitrum
  - Severity is always set to "high"
  - Type is always set to "suspicious"
  - Metadata
    - `chainName`: name of chain invariant is violated on
    - `chainId`: ID of chain invariant is violated on
    - `l1EscrowBalance`: balance of L2 chain's L1 escrow contract
    - `l2Supply`: total supply of DAI on L2

## Test Data

The bot behaviour can be verified with the following block:

- [14020169](https://etherscan.io/block/14020169)
