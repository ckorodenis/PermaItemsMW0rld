import {
    Args,
    boolToByte,
    stringToBytes,
    u256ToBytes,
    bytesToString,
    bytesToU256,
    u64ToBytes,
    bytesToU64,
  } from '@massalabs/as-types';
  import {
    _constructor,
    _update,
  } from './NFT-internals';
  
  import { setOwner, onlyOwner, ownerAddress } from '../utilities/ownership';
  import {
    Storage,
    generateEvent,
    transferCoins,
    Address,
  } from '@massalabs/massa-as-sdk';
  import { Context } from '@massalabs/massa-as-sdk';
  import { u256 } from 'as-bignum/assembly';
  
  // Constants for keys
  const BASE_URI_KEY = stringToBytes('BASE_URI');
  const COUNTER_KEY = stringToBytes('COUNTER');
  const MAX_SUPPLY_KEY = stringToBytes('MAX_SUPPLY');
  const MINT_PRICE_KEY = stringToBytes('MINT_PRICE');
  const ITEM_TYPE_KEY = 'ITEM_METADATA:';
  
  // Default NFT properties
  const DEFAULT_XP = 0;
  const DEFAULT_MAG = 0;
  const DEFAULT_CONDITION = 100;
  
  // Limits
  const ITEM_MAX_SUPPLY = u256.fromU32(5000);
  
  // Item Prices
  const ITEM_PRICES: Map<string, u64> = new Map<string, u64>();
  ITEM_PRICES.set('TitanRope', 80);
  ITEM_PRICES.set('MagLum', 100);
  ITEM_PRICES.set('NanoShelter', 350);
  ITEM_PRICES.set('CrystalCondenser', 150);
  ITEM_PRICES.set('CrystalSynthesizer', 500);
  
  export function constructor(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const name = args.nextString().expect('Name missing.');
    const symbol = args.nextString().expect('Symbol missing.');
    const baseURI = args.nextString().expect('Base URI missing.');
  
    _constructor(name, symbol);
    setOwner(new Args().add(Context.caller().toString()).serialize());
  
    Storage.set(BASE_URI_KEY, stringToBytes(baseURI));
    Storage.set(MAX_SUPPLY_KEY, u256ToBytes(ITEM_MAX_SUPPLY));
    Storage.set(COUNTER_KEY, u256ToBytes(u256.Zero));
    generateEvent('NFT Collection Deployed');
  }
  
  /**
   * Mint a new NFT based on item type.
   */
  export function mintItem(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const itemType = args.nextString().expect('Item type missing.');
    const to = args.nextString().expect('Target address missing.');
  
    const price = ITEM_PRICES.get(itemType);
    assert(price != null, 'Invalid item type.');
  
    if (Context.caller().toString() != ownerAddress([])) {
      assert(Context.transferredCoins() >= price!, 'Not enough coins sent.');
    }
  
    // Increment counter
    const currentSupply = bytesToU256(Storage.get(COUNTER_KEY));
    assert(currentSupply < ITEM_MAX_SUPPLY, 'Max supply reached.');
    const newSupply = currentSupply + u256.One;
  
    Storage.set(COUNTER_KEY, u256ToBytes(newSupply));
  
    // Store default metadata
    const metadataKey = ITEM_TYPE_KEY + newSupply.toString();
    const metadata = `${itemType},XP=${DEFAULT_XP},MAG=${DEFAULT_MAG},CONDITION=${DEFAULT_CONDITION}`;
    Storage.set(stringToBytes(metadataKey), stringToBytes(metadata));
  
    _update(to, newSupply, '');
    generateEvent(`${itemType} minted to ${to}`);
  
    // Transfer funds to owner
    if (Context.transferredCoins() > 0) {
      transferCoins(new Address(ownerAddress([])), Context.transferredCoins());
    }
  }
  
  /**
   * Edit metadata for a specific NFT (owner only).
   */
  export function editMetadata(binaryArgs: StaticArray<u8>): void {
    onlyOwner();
  
    const args = new Args(binaryArgs);
    const tokenId = args.nextU256().expect('Token ID missing.');
    const keyValue = args.nextString().expect('Metadata key-value pair missing.');
  
    const metadataKey = ITEM_TYPE_KEY + tokenId.toString();
    const currentMetadata = bytesToString(Storage.get(stringToBytes(metadataKey)));
    const updatedMetadata = updateMetadata(currentMetadata, keyValue);
  
    Storage.set(stringToBytes(metadataKey), stringToBytes(updatedMetadata));
    generateEvent(`Metadata updated for Token#${tokenId}`);
  }
  
  /**
   * Utility function to update key-value pairs in metadata.
   */
  function updateMetadata(current: string, update: string): string {
    const updates = update.split('=');
    assert(updates.length == 2, 'Invalid key-value format.');
  
    const key = updates[0];
    const value = updates[1];
  
    const metadataParts = current.split(',');
    let updated = '';
    let found = false;
  
    for (let i = 0; i < metadataParts.length; i++) {
      const part = metadataParts[i];
      if (part.startsWith(key + '=')) {
        updated += `${key}=${value},`;
        found = true;
      } else {
        updated += part + ',';
      }
    }
  
    if (!found) updated += `${key}=${value},`;
    return updated.slice(0, -1); // Remove trailing comma
  }
  
  /**
   * Retrieve metadata for a specific NFT.
   */
  export function getMetadata(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const tokenId = args.nextU256().expect('Token ID missing.');
  
    const metadataKey = ITEM_TYPE_KEY + tokenId.toString();
    return Storage.get(stringToBytes(metadataKey));
  }
  
  /**
   * Get the current supply of minted NFTs.
   */
  export function currentSupply(): StaticArray<u8> {
    return Storage.get(COUNTER_KEY);
  }
  
