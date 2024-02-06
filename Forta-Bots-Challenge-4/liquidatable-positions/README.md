# Compound III Liquidatable Positions Bot

## Description

This bot monitors COMP III's Comet Ethereum Mainnet contracts for base assets WETH and USDC. It tracks open borrow positions from incoming supply/withdraw transactions and then check's their liquidatability each block to return liquidatable positions along with their collateral balances and current collateral quotes from the protocol.

## Supported Chains

- Ethereum

## Alerts

- COMPIII-POSITION
  - Fired when a transaction contains a supply/withdraw function call indicating a newly tracked borrow position over the threshold
  - Severity is always set to "low"
  - Type is always set to "info" (mention any conditions where it could be something else)
  - Metadata
    - `accountOwner`: address of the account with open borrow position

- COMPIII-LIQUID
  - Fired when a currently cached position is liquidatable on it's respective base asset's Comet contract
  - Severity is always set to "high"
  - Type is always set to "info"
  - Metadata
    - `accountOwner`: address of the account with open borrow position
    - `balance`: current negative borrow balance of the account
    - `collateralBalances`: current collateral balance of the account for each supported collateral asset
    - `collateralQuotes`: current exchange rate of each supported collateral asset for 1 of the Comet instance's base asset

## Test Data

The bot behaviour can be verified with the following transactions:
- _Note_: Ttransaction may be outdated and position may no longer be open

- [0x23e5a57dcd73dff352684d26337bfc29d02444b04811078fcd761fc867ca20f9](https://etherscan.io/tx/0x23e5a57dcd73dff352684d26337bfc29d02444b04811078fcd761fc867ca20f9)
