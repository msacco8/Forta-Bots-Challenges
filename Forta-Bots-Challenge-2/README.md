# Uniswap V3 Swap Detection Bot

## Description

This bot detects Swap events that are emitted by Uniswap V3 pools

## Supported Chains

- Ethereum

## Alerts

- NETHERMIND-1
  - Fired when a Swap event is emitted by a Uniswap V3 pool
  - Severity is always set to "low"
  - Type is always set to "info"
  - Metadata
    - "sender": address of first participant
    - "recipient": address of second participant
    - "token0": first token's symbol
    - "token1": second token's symbol
    - "amount0": amount swapped by first participant
    - "amount1": amount swapped by second participant
    - "fee": the pool's fee in hundredths of a bip, i.e. 1e-6
    - "sqrtPriceX96": square root of price ratio
    - "liquidity": liquidity at time of swap,
    - "tick": tick that swap occurred in
    - "pool": address of the pool

## Test Data

The bot behaviour can be verified with the following transactions:

- 0x89cc7de142692e2d869a6c680a4e866c5221737f720dce4fff6e6745d25c9a11
- 0x51533a39eb28fb8a43f8054634c92dfb29c782857a270b843b2a7cd778f33cbd
