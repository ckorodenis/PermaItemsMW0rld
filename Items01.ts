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
  _approve,
  _balanceOf,
  _constructor,
  _getApproved,
  _isApprovedForAll,
  _name,
  _ownerOf,
  _setApprovalForAll,
  _symbol,
  _update,
  _transferFrom,
} from './NFT-internals';

import { setOwner, onlyOwner, ownerAddress } from '../utilities/ownership';
import {
  Storage,
  generateEvent,
  transferCoins,
  Address,
} from '@massalabs/massa-as-sdk';
import { Context, isDeployingContract } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

export const BASE_URI_KEY = stringToBytes('BASE_URI');
export const MAX_SUPPLY_KEY = stringToBytes('MAX_SUPPLY');
export const COUNTER_KEY = stringToBytes('COUNTER');
export const ITEM_TYPE_KEY = stringToBytes('ITEM_METADATA:');
export const TOKEN_OWNER_KEY = stringToBytes('TOKEN_OWNER:');
export const APPROVED_KEY = stringToBytes('APPROVED:');
export const OPERATOR_APPROVAL_KEY = stringToBytes('OPERATOR_APPROVAL:');
export const RARITY_KEY = stringToBytes('RARITY:');
export const ITEM_PRICE_PREFIX = stringToBytes('ITEM_PRICE:');
export const BALANCE_KEY = stringToBytes('BALANCE:');

const DEFAULT_XP = 0;
const DEFAULT_MAG = 0;
const DEFAULT_CONDITION = 100;
const ITEM_MAX_SUPPLY = u256.fromU32(50000);

/**
 * @param binaryArgs - serialized strings representing the name of the NFT
 *
 * @remarks This is the constructor of the contract. It initializes the NFT collection with default values for symbol, base URI, and owner.
 /
export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(isDeployingContract());
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('Name missing.');

  // Default values for missing arguments
  const symbol = "DEFAULT_SYMBOL";
  const baseURI = "DEFAULT_BASE_URI";
  const owner = Context.caller().toString();

  _constructor(name, symbol);
  setOwner(new Args().add(owner).serialize());

  Storage.set(BASE_URI_KEY, stringToBytes(baseURI));
  Storage.set(MAX_SUPPLY_KEY, u256ToBytes(ITEM_MAX_SUPPLY));
  Storage.set(COUNTER_KEY, u256ToBytes(u256.Zero));

  // Set initial item prices
  setItemPrice('TR', 80);
  setItemPrice('ML', 100);
  setItemPrice('NS', 350);
  setItemPrice('CC', 150);
  setItemPrice('CS', 500);

  generateEvent('NFT COLLECTION IS DEPLOYED');
}

/*
 * @param itemType - string representing the type of item
 * @param price - u64 representing the price of the item
 *
 * @remarks Sets the price for a specific item type.
 /
function setItemPrice(itemType: string, price: u64): void {
  const key = concatByteArrays(ITEM_PRICE_PREFIX, stringToBytes(itemType));
  Storage.set(key, u64ToBytes(price));
}

/*
 * @param itemType - string representing the type of item
 * @returns u64 - price of the item
 *
 * @remarks Gets the price for a specific item type.
 /
function getItemPrice(itemType: string): u64 {
  const key = concatByteArrays(ITEM_PRICE_PREFIX, stringToBytes(itemType));
  const priceBytes = Storage.get(key);
  if (priceBytes == null) {
    generateEvent(Price not found for itemType: ${itemType});
    assert(false, Price for item ${itemType} not found.);
  }
  return bytesToU64(priceBytes);
}

export function name(): string {
  return _name();
}

export function symbol(): string {
  return _symbol();
}

export function balanceOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const address = args.nextString().expect('Address missing');
  return u256ToBytes(_balanceOf(address));
}

export function ownerOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing');
  return stringToBytes(_ownerOf(tokenId));
}

export function approve(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const to = args.nextString().expect('To address missing');
  const tokenId = args.nextU256().expect('Token ID missing');
  _approve(to, tokenId);
}

export function getApproved(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing');
  return stringToBytes(_getApproved(tokenId));
}

export function setApprovalForAll(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const operator = args.nextString().expect('Operator missing');
  const approved = args.nextBool().expect('Approved boolean missing');
  _setApprovalForAll(operator, approved);
}

export function isApprovedForAll(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = args.nextString().expect('Owner missing');
  const operator = args.nextString().expect('Operator missing');
  return boolToByte(_isApprovedForAll(owner, operator));
}

export function transferFrom(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const from = args.nextString().expect('From address missing');
  const to = args.nextString().expect('To address missing');
  const tokenId = args.nextU256().expect('Token ID missing');
  _transferFrom(from, to, tokenId);
}


export function tokenURI(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing');
  const baseURIBytes = Storage.get(BASE_URI_KEY);
  const baseURI = bytesToString(baseURIBytes);
  const metadataKey = concatByteArrays(ITEM_TYPE_KEY, stringToBytes(tokenId.toString()));
  const metadataBytes = Storage.get(metadataKey);
  const metadata = bytesToString(metadataBytes !== null ? metadataBytes! : new StaticArray<u8>(0));
  
  const uri = ${baseURI}/${tokenId.toString()}?${metadata};
  return stringToBytes(uri);
}

export function listKeys(): StaticArray<StaticArray<u8>> {
  return [
    BASE_URI_KEY,
    MAX_SUPPLY_KEY,
    COUNTER_KEY,
    concatByteArrays(ITEM_PRICE_PREFIX, stringToBytes('TR')),
    concatByteArrays(ITEM_PRICE_PREFIX, stringToBytes('ML')),
    concatByteArrays(ITEM_PRICE_PREFIX, stringToBytes('NS')),
    concatByteArrays(ITEM_PRICE_PREFIX, stringToBytes('CC')),
    concatByteArrays(ITEM_PRICE_PREFIX, stringToBytes('CS')),
  ];
}


function addU256(a: u256, b: u256): u256 {
  return u256.add(a, b);
}

/*
 * @param binaryArgs - serialized arguments representing the item type and target address for minting
 *
 * @remarks Mints a new item with specific type to the target address, checking for supply and price.
 /
export function mintItem(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const itemType = args.nextString().expect('Item type missing.');
  const to = args.nextString().expect('Target address missing.');

  const price = getItemPrice(itemType);
  if (Context.caller().toString() !== bytesToString(ownerAddress(new StaticArray<u8>(0)))) {
    assert(Context.transferredCoins() >= price, 'Not enough coins sent.');
  }

  const currentSupply = bytesToU256(Storage.get(COUNTER_KEY));
  assert(currentSupply < ITEM_MAX_SUPPLY, 'Max supply reached.');

  const newSupply = addU256(currentSupply, u256.One);
  Storage.set(COUNTER_KEY, u256ToBytes(newSupply));

  const metadataKey = concatByteArrays(ITEM_TYPE_KEY, stringToBytes(newSupply.toString()));
  const metadata = generateMetadata(itemType, newSupply);
  Storage.set(metadataKey, stringToBytes(metadata));

  const ownerKey = concatByteArrays(TOKEN_OWNER_KEY, stringToBytes(newSupply.toString()));
  Storage.set(ownerKey, stringToBytes(to));
  
  incrementBalance(to);

  _update(to, newSupply, '');

  generateEvent(${itemType} minted to ${to});

  if (Context.transferredCoins() > 0 && Context.caller().toString() !== bytesToString(ownerAddress(new StaticArray<u8>(0)))) {
    transferCoins(new Address(bytesToString(ownerAddress(new StaticArray<u8>(0)))), Context.transferredCoins());
  }
}

/*
 * @returns StaticArray<u8> - current number of minted tokens
 *
 * @remarks Returns the current supply of tokens.
 /
export function currentSupply(): StaticArray<u8> {
  return Storage.get(COUNTER_KEY);
}

/*
 * @returns StaticArray<u8> - maximum number of tokens that can be minted
 *
 * @remarks Returns the maximum supply of tokens.
 /
export function maxSupply(): StaticArray<u8> {
  return Storage.get(MAX_SUPPLY_KEY);
}

// ... (funkce generateMetadata, incrementBalance atd. zůstávají stejné)

// Funkce pro update metadat a rarity zůstávají stejné

/*
 * @param itemType - string representing the type of item
 * @param tokenId - u256 representing the token ID
 * @returns string - generated metadata for the item
 *
 * @remarks Generates metadata for a specific item type and token ID.
 /
function generateMetadata(itemType: string, tokenId: u256): string {
  const rarityKey = concatByteArrays(RARITY_KEY, stringToBytes(tokenId.toString()));
  const rarity = bytesToString(Storage.get(rarityKey) || stringToBytes('Undefined'));
  return ${itemType},XP=${DEFAULT_XP},MAG=${DEFAULT_MAG},CONDITION=${DEFAULT_CONDITION},RARITY=${rarity};
}

/*
 * @param owner - string representing the owner's address
 *
 * @remarks Increments the balance of tokens for an owner.
 /
function incrementBalance(owner: string): void {
  const balanceKey = concatByteArrays(BALANCE_KEY, stringToBytes(owner));
  const currentBalance = bytesToU256(Storage.get(balanceKey) || u256ToBytes(u256.Zero));
  Storage.set(balanceKey, u256ToBytes(addU256(currentBalance, u256.One)));
}

/*
 * @param binaryArgs - serialized arguments representing the token ID and new XP, MAG, CONDITION values
 *
 * @remarks Updates XP, MAG, and CONDITION metadata for a specific token, only callable by the contract owner.
 /
export function updateItemMetadata(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing.');
  const newXP = args.nextU32().expect('XP value missing.');
  const newMAG = args.nextU32().expect('MAG value missing.');
  const newCondition = args.nextU32().expect('CONDITION value missing.');

  const metadataKey = concatByteArrays(ITEM_TYPE_KEY, stringToBytes(tokenId.toString()));
  const currentMetadata = bytesToString(Storage.get(metadataKey) || new StaticArray<u8>(0));
  
  // Split current metadata into parts
  const parts = currentMetadata.split(',');
  let itemType: string = "";
  let rarity: string = "Undefined";
  let xpIndex = -1;
  let magIndex = -1;
  let conditionIndex = -1;
  let rarityIndex = -1;

  // Find indices for each attribute
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].indexOf("XP=") == 0) xpIndex = i;
    else if (parts[i].indexOf("MAG=") == 0) magIndex = i;
    else if (parts[i].indexOf("CONDITION=") == 0) conditionIndex = i;
    else if (parts[i].indexOf("RARITY=") == 0) {
      rarityIndex = i;
      rarity = parts[i].substring(7); // Remove 'RARITY=' prefix
    } else {
      itemType = parts[i]; // Assume the first part without '=' is the item type
    }
  }

  // Update metadata parts
  parts[xpIndex] = XP=${newXP};
  parts[magIndex] = MAG=${newMAG};
  parts[conditionIndex] = CONDITION=${newCondition};

  // Join the parts back together
  const updatedMetadata = parts.join(',');

  // Save updated metadata
  Storage.set(metadataKey, stringToBytes(updatedMetadata));
  generateEvent(Metadata for token ${tokenId.toString()} updated);
}
/*
 * @param binaryArgs - serialized arguments representing the token ID and new rarity value
 *
 * @remarks Sets the rarity for a specific token ID, only callable by the contract owner.
 */
export function setRarity(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing.');
  const rarity = args.nextString().expect('Rarity value missing.');

  const rarityKey = concatByteArrays(RARITY_KEY, stringToBytes(tokenId.toString()));
  Storage.set(rarityKey, stringToBytes(rarity));
  generateEvent(Rarity for token ${tokenId.toString()} set to ${rarity});
}

// Helper function to concatenate two StaticArray<u8>
function concatByteArrays(a: StaticArray<u8>, b: StaticArray<u8>): StaticArray<u8> {
  let result = new Array<u8>(a.length + b.length);
  memory.copy(changetype<usize>(result), changetype<usize>(a), a.length);
  memory.copy(changetype<usize>(result) + a.length, changetype<usize>(b), b.length);
  return changetype<StaticArray<u8>>(result);
}