# MakerDAO Bridge Invariant Bot

## Description

This bot detects when the MakerDAO bridge invariant is violated on Arbitrum and Optimism

## Supported Chains

- Ethereum
- Arbitrum
- Optimism

## Alerts

- NETHERMIND-1
  - Fired when the supply invariant of the MakerDAO Bridge is violated on Optimism or Arbitrum
  - Severity is always set to "low"
  - Type is always set to "info"
  - Metadata
    - `chainName`: name of chain invariant is violated on
    - `chainId`: ID of chain invariant is violated on
    - `l1EscrowBalance`: balance of L2 chain's L1 escrow contract
    - `l2Supply`: total supply of DAI on L2

## Test Data

The bot behaviour can be verified with the following block:
