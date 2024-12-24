# NFT Smart Contract on Massa Blockchain

This repository contains a smart contract written in AssemblyScript for the Massa Blockchain. The contract implements a Non-Fungible Token (NFT) system, including ERC-165 compatibility. Below is a detailed description of the functions, their purposes, and usage instructions.

---

## Table of Contents
- [Overview](#overview)
- [Deployment](#deployment)
- [Functions](#functions)
  - [Constructor](#constructor)
  - [Minting NFTs](#minting-nfts)
  - [Querying Data](#querying-data)
    - [Owner of Token](#owner-of-token)
    - [Balance of Address](#balance-of-address)
    - [Token Metadata URI](#token-metadata-uri)
    - [Current Supply](#current-supply)
  - [Admin Functions](#admin-functions)
    - [Set Rarity](#set-rarity)
    - [Update Token Data](#update-token-data)
    - [Owner Address Management](#owner-address-management)
  - [Interface Support](#interface-support)

---

## Overview
This contract implements a flexible NFT system that allows minting, querying, and updating token metadata. It also supports assigning rarity levels to NFTs and implements security measures to ensure only the contract owner can perform administrative actions.

---

## Deployment
To deploy the contract, pass the following arguments:
1. **Name**: The name of the NFT collection.
2. **Symbol**: The symbol for the NFTs.
3. **Base URI**: The base URI for metadata retrieval.

Example:
```typescript
const args = new Args()
  .add("MyCollection")
  .add("MCN")
  .add("https://mycollection.com/metadata");
deployContract(args.serialize());
```

---

## Functions

### Constructor
**Function:** `constructor(binaryArgs: StaticArray<u8>)`

Initializes the contract with a collection name, symbol, and base URI. Sets the owner to the address of the deployer and initializes storage for metadata and counters.

- **Arguments:**
  - `binaryArgs`: Serialized arguments containing the collection name, symbol, and base URI.

- **Example:**
```typescript
const args = new Args()
  .add("MyCollection")
  .add("MCN")
  .add("https://mycollection.com");
constructor(args.serialize());
```

---

### Minting NFTs
**Function:** `mintItem(binaryArgs: StaticArray<u8>)`

Allows minting of new NFTs by specifying the item type and target address. Checks the max supply limit and deducts the required coins from the caller if they are not the owner.

- **Arguments:**
  - `binaryArgs`: Serialized arguments containing the item type and target address.

- **Example:**
```typescript
const args = new Args()
  .add("TitanRope")
  .add("address123");
mintItem(args.serialize());
```

---

### Querying Data
#### Owner of Token
**Function:** `ownerOf(binaryArgs: StaticArray<u8>)`

Returns the owner address of a specific token ID.

- **Arguments:**
  - `binaryArgs`: Serialized arguments containing the token ID.

- **Example:**
```typescript
const args = new Args().addU256(tokenId);
const owner = ownerOf(args.serialize());
```

---

#### Balance of Address
**Function:** `balanceOf(binaryArgs: StaticArray<u8>)`

Returns the balance (number of NFTs owned) of a specific address.

- **Arguments:**
  - `binaryArgs`: Serialized arguments containing the owner address.

- **Example:**
```typescript
const args = new Args().add("address123");
const balance = balanceOf(args.serialize());
```

---

#### Token Metadata URI
**Function:** `tokenURI(binaryArgs: StaticArray<u8>)`

Generates a metadata URI for a specific token ID based on the base URI and token-specific metadata.

- **Arguments:**
  - `binaryArgs`: Serialized arguments containing the token ID.

- **Example:**
```typescript
const args = new Args().addU256(tokenId);
const metadataURI = tokenURI(args.serialize());
```

---

#### Current Supply
**Function:** `currentSupply()`

Returns the current number of minted NFTs.

- **Example:**
```typescript
const supply = currentSupply();
```

---

### Admin Functions
#### Set Rarity
**Function:** `setRarity(binaryArgs: StaticArray<u8>)`

Allows the contract owner to set the rarity for a specific token ID.

- **Arguments:**
  - `binaryArgs`: Serialized arguments containing the token ID and rarity value.

- **Example:**
```typescript
const args = new Args()
  .addU256(tokenId)
  .add("Legendary");
setRarity(args.serialize());
```

---

#### Update Token Data
**Function:** `_update(to: string, tokenId: u256, metadata: string)`

Updates the metadata and owner information for a specific token ID.

- **Arguments:**
  - `to`: Target address for the token.
  - `tokenId`: Token ID.
  - `metadata`: Metadata string.

- **Example:**
```typescript
_update("address123", tokenId, "New metadata");
```

---

#### Owner Address Management
**Function:** `setOwner(owner: string)`

Sets the owner of the contract.

- **Arguments:**
  - `owner`: Address of the new owner.

**Function:** `ownerAddress()`

Retrieves the current owner address.

- **Example:**
```typescript
setOwner("newOwnerAddress");
const owner = ownerAddress();
```

---

### Interface Support
**Function:** `supportsInterface(binaryArgs: StaticArray<u8>)`

Checks if the contract supports a specific interface.

- **Arguments:**
  - `binaryArgs`: Serialized arguments containing the interface ID.

- **Example:**
```typescript
const args = new Args().add("0x80ac58cd");
const isSupported = supportsInterface(args.serialize());
```

---

## Notes
- Ensure sufficient coins are transferred for minting NFTs if the caller is not the owner.
- The `Context` module is used for retrieving the caller address and transferred coins.
- Administrative functions are restricted to the contract owner.

Feel free to raise issues or contribute to this repository!

