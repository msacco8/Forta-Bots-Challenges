# Compound III Proposal

## Summary

- Compound III is a protocol that allows users to submit collateral in one asset to borrow an amount of a deployment's base asset
- Users can also supply a deployment's base asset to earn interest
- The protocol is governed by COMP holders and can be deployed on any EVM compatible chain with other base assets

## Proposed Bots:

- COMP01: Pause Watcher
    - Monitor pauses to the protocol's functionalities and then provide information about the last transactions that utilized the paused functionality
    - Pauses to the protocol occur in the case of unforeseen vulnerabilities and information about the last transaction that utilized the paused functionality may provide insight into the vulnerability and the reason behind the pause taking place
- COMP02: Utilization Rate
    - Monitor the utilization rate on Mainnet USDC and WETH Comet instantiations to generate a finding when the rate surpasses the instance's kink
    - Continue to monitor the utilization rate while storing the previous value and generate findings when the utilization rate drops back below the kink threshold or increases by some user defined percentage
    - When the utilization rate is greater than the kink, the interest rates increase rapidly and this would be useful for both suppliers and borrowers to inform their decisions on their positions
- COMP03: Liquidatable Positions
    - Monitors a limited amount of newly opened borrowing positions and checks each block to send an alert if the position is liquidatable
    - Listens on Ethereum Mainnet USDC and WETH deployments
    - Liquidated positions return the collateral for the borrow back to the protocol and in some cases liquidators can buy the collateral at a discount
    - Monitoring this contributes to protocol health and provides opportunities to liquidators

## Proposed Solution:

- COMP01: Pause Watcher
    - Pauses can be made for supply, transfer, withdraw, absorb and buy actions and their function names on a Comet instance are as follows: supplyInternal, transferInternal, withdrawInternal, absorb, buyCollateral
    - Filter transactions for each of these actions made from Mainnet USDC and cache information about each one. Update the cache every time a more recent action occurs
    - Filter transaction event for the "PauseAction" event. When a pause occurs, generate a finding that includes information about which actions have been paused, and the latest transactions that occured exercising these actions.
- COMP02: Utilization Rate
    - For Mainnet USDC and WETH Comet contracts, call getUtilization on each block and compare with the kink value that increases the interest rate for supply and borrow
    - In the event that the utilization rate is greater than the kink, generate a finding that includes the modified borrow and/or supply rate due to the kink threshold
    - Store this utilization rate and continue to compare each block's rate with previous finding's rate
    - Do not generate new findings for a Comet instance until the utilization rate drops below the kink or increases by some user defined percentage and in these cases generate a unique finding for the scenario
- COMP03: Liquidatable Positions
    - Listen for transfer events to EOAs emitted by Mainnet USDC and WETH Comet contracts.
    - Maintain a cache of addresses that either recently opened or added to borrowing positions in a FIFO cache to allow for positions to exist in memory for longer when at capacity
    - Cache size and position size filtering should be considered to reduce contract reads. Perhaps only include positions greater than some set threshold?
    - At each block you must check the state of each position to see if it is liquidatable by calling isLiquidatable from the Comet contract the position is held on
    - If position is liquidatable then generate a finding and query totalBorrow and collateralBalanceOf
    - Additionally, query quoteCollateral to provide information on buying the collateral back at a discount when it is liquidated
