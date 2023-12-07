# Large Tether Transfer Agent

## Description

This bot detects created and updated bots deployed by Nethermind to the Forta Bot Registry

## Supported Chains

- Ethereum

## Alerts

- FORTA-1
  - Fired when a new bot has been deployed to the Forta Bot Registry by Nethermind
  - Severity is always set to "low" (mention any conditions where it could be something else)
  - Type is always set to "info" (mention any conditions where it could be something else)
  - agentID, address deployed from, call metadata and chainIDs are stored

- FORTA-1
  - Fired when a bot in the Forta Bot Registry is updated by Nethermind
  - Severity is always set to "low" (mention any conditions where it could be something else)
  - Type is always set to "info" (mention any conditions where it could be something else)
  - agentID, call metadata and chainIDs are stored

## Test Data

The bot behaviour can be verified with the following transactions:

- 0x0935634fba119333faaff9406fb8d6c077e9868fe7f4d6afbafa7c195087fb23 (createAgent call from Nethermind)
- 0xbcc37f4a40179ad15b667c06e55761c0222c09fe1737a4bee0f5104a066e4aac (updateAgent call from Nethermind)
