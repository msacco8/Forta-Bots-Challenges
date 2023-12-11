# Nethermind Update and Creation Detection Bot

## Description

This bot detects created and updated bots deployed by Nethermind to the Forta Bot Registry

## Supported Chains

- Ethereum

## Alerts

- NETHERMIND-1

  - Fired when a new bot has been deployed to the Forta Bot Registry by Nethermind
  - Severity is always set to "low"
  - Type is always set to "info"
  - Metadata fields
    - "agentID": ID of the bot
    - "from" : the address used to deploy bot
    - "metadata": misc. information about bot
    - "chainIDs": list of chains the bot works on

- NETHERMIND-2
  - Fired when a bot in the Forta Bot Registry is updated by Nethermind
  - Severity is always set to "low"
  - Type is always set to "info"
  - Metadata fields
    - "agentID": ID of the bot
    - "metadata": misc. information about bot
    - "chainIDs": list of chain IDs for the chains the bot works on

## Test Data

The bot behaviour can be verified with the following transactions:

- 0x0935634fba119333faaff9406fb8d6c077e9868fe7f4d6afbafa7c195087fb23 (createAgent call from Nethermind)
- 0xbcc37f4a40179ad15b667c06e55761c0222c09fe1737a4bee0f5104a066e4aac (updateAgent call from Nethermind)
