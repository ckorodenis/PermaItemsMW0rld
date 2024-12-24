import {
  Args,
  stringToBytes,
  u256ToBytes,
  bytesToString,
  bytesToU256,
} from '@massalabs/as-types';
import {
  Storage,
  generateEvent,
  transferCoins,
  Address,
} from '@massalabs/massa-as-sdk';
import { Context } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

// Funkce pro získání hodnoty nebo výchozího nastavení
function getOrDefault(key: StaticArray<u8>, defaultValue: StaticArray<u8>): StaticArray<u8> {
  const value = Storage.get(key);
  return value != null ? value : defaultValue;
}

// Funkce `_constructor` a `_update`
function _constructor(name: string, symbol: string): void {
  Storage.set(stringToBytes("NAME"), stringToBytes(name));
  Storage.set(stringToBytes("SYMBOL"), stringToBytes(symbol));
}

function _update(to: string, tokenId: u256, metadata: string): void {
  Storage.set(stringToBytes(`TOKEN_METADATA:${tokenId.toString()}`), stringToBytes(metadata));
  Storage.set(stringToBytes(`TOKEN_OWNER:${tokenId.toString()}`), stringToBytes(to));
}

// Funkce `setOwner`, `onlyOwner`, `ownerAddress`
function setOwner(owner: string): void {
  Storage.set(stringToBytes("OWNER"), stringToBytes(owner));
}

function ownerAddress(): string {
  const owner = Storage.get(stringToBytes("OWNER"));
  assert(owner != null, "Owner not set.");
  return bytesToString(owner);
}

function onlyOwner(): void {
  const caller = Context.caller().toString();
  const owner = ownerAddress();
  assert(caller == owner, "Caller is not the owner.");
}

// Generování metadat
function generateMetadata(itemType: string, tokenId: u256): string {
  const rarityKey = RARITY_KEY + tokenId.toString();
  const rarity = bytesToString(
    getOrDefault(stringToBytes(rarityKey), stringToBytes('Undefined'))
  );

  return `${itemType},XP=${DEFAULT_XP},MAG=${DEFAULT_MAG},CONDITION=${DEFAULT_CONDITION},RARITY=${rarity}`;
}

// Zbytek kódu (mintItem, balanceOf, incrementBalance, atd.) je upraven podle výše uvedených poznámek.


// Constants for keys
const BASE_URI_KEY = stringToBytes('BASE_URI');
const COUNTER_KEY = stringToBytes('COUNTER');
const MAX_SUPPLY_KEY = stringToBytes('MAX_SUPPLY');
const ITEM_TYPE_KEY = 'ITEM_METADATA:';
const TOKEN_OWNER_KEY = 'TOKEN_OWNER:';
const BALANCE_KEY = 'BALANCE:';

// Default NFT properties
const DEFAULT_XP = 0;
const DEFAULT_MAG = 0;
const DEFAULT_CONDITION = 100;
const RARITY_KEY = 'RARITY:';


// Limits
const ITEM_MAX_SUPPLY = u256.fromU32(50000);

// Item Prices
const ITEM_PRICES: Map<string, u64> = new Map<string, u64>();
ITEM_PRICES.set('TitanRope', 80);
ITEM_PRICES.set('MagLum', 100);
ITEM_PRICES.set('NanoShelter', 350);
ITEM_PRICES.set('CrystalCondenser', 150);
ITEM_PRICES.set('CrystalSynthesizer', 500);

/** ERC-165 Interface IDs */
const ERC721_INTERFACE_ID = '0x80ac58cd';
const ERC165_INTERFACE_ID = '0x01ffc9a7';

/**
 * Constructor function to initialize the NFT contract
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('Name missing.');
  const symbol = args.nextString().expect('Symbol missing.');
  const baseURI = args.nextString().expect('Base URI missing.');

  _constructor(name, symbol);
  setOwner(Context.caller().toString());


  Storage.set(BASE_URI_KEY, stringToBytes(baseURI));
  Storage.set(MAX_SUPPLY_KEY, u256ToBytes(ITEM_MAX_SUPPLY));
  Storage.set(COUNTER_KEY, u256ToBytes(u256.Zero));
  generateEvent('NFT Collection Deployed');
}

/**
 * ERC-165: Check interface support
 */
export function supportsInterface(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const interfaceId = args.nextString().expect('Interface ID missing.');
  const supported =
    interfaceId == ERC721_INTERFACE_ID || interfaceId == ERC165_INTERFACE_ID;
  return new Args().add(supported).serialize();
}


/**
 * Mint a new NFT based on item type.
 */
export function mintItem(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const itemType = args.nextString().expect('Item type missing.');
  const to = args.nextString().expect('Target address missing.');

  const price = ITEM_PRICES.get(itemType);

  if (Context.caller().toString() != bytesToString(Storage.get(stringToBytes("OWNER")))) {
    assert(Context.transferredCoins() >= price!, 'Not enough coins sent.');
  }

  // Increment counter
  const currentSupply = bytesToU256(
    getOrDefault(COUNTER_KEY, u256ToBytes(u256.Zero))
  );
  
  assert(currentSupply < ITEM_MAX_SUPPLY, 'Max supply reached.');
  const newSupply = currentSupply + u256.One;
  Storage.set(COUNTER_KEY, u256ToBytes(newSupply));

  // Store metadata
  const metadataKey = ITEM_TYPE_KEY + newSupply.toString();
  const metadata = generateMetadata(itemType, newSupply);
  Storage.set(stringToBytes(metadataKey), stringToBytes(metadata));

  // Assign ownership
  const ownerKey = TOKEN_OWNER_KEY + newSupply.toString();
  Storage.set(stringToBytes(ownerKey), stringToBytes(to));
  incrementBalance(to);

  _update(to, newSupply, '');
  generateEvent(`${itemType} minted to ${to}`);

  // Transfer funds to owner
  if (Context.transferredCoins() > 0) {
    transferCoins(new Address(ownerAddress()), Context.transferredCoins());
  }
}

/**
 * Get owner of a token
 */
export function ownerOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing.');
  const ownerKey = TOKEN_OWNER_KEY + tokenId.toString();
  return Storage.get(stringToBytes(ownerKey));
}

/**
 * Get balance of an address
 */
export function balanceOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = args.nextString().expect('Owner address missing.');
  const balanceKey = BALANCE_KEY + owner;
  return getOrDefault(stringToBytes(balanceKey), u256ToBytes(u256.Zero));
}

/**
 * Utility to increment balance
 */
function incrementBalance(owner: string): void {
  const balanceKey = BALANCE_KEY + owner;
  const currentBalance = bytesToU256(getOrDefault(stringToBytes(balanceKey), u256ToBytes(u256.Zero)));
  Storage.set(stringToBytes(balanceKey), u256ToBytes(currentBalance + u256.One));
}

/**
 * Retrieve metadata for a specific NFT.
 */
export function tokenURI(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing.');
  const metadataKey = ITEM_TYPE_KEY + tokenId.toString();
  const baseURI = bytesToString(Storage.get(BASE_URI_KEY));
  const metadata = generateMetadata(
    bytesToString(Storage.get(stringToBytes(metadataKey))),
    tokenId
  );

  const uri = `${baseURI}/${tokenId.toString()}?${metadata}`;
  return stringToBytes(uri);
}


/**
 * Set the Rarity for a specific token
 * Only the owner of the smart contract can call this function.
 */
export function setRarity(binaryArgs: StaticArray<u8>): void {
  onlyOwner(); // Zkontroluje, zda volající je majitel kontraktu

  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing.');
  const rarity = args.nextString().expect('Rarity value missing.');

  const rarityKey = RARITY_KEY + tokenId.toString();
  Storage.set(stringToBytes(rarityKey), stringToBytes(rarity));

  generateEvent(`Rarity for token ${tokenId.toString()} set to ${rarity}`);
}

/**
 * Get the current supply of minted NFTs.
 */
export function currentSupply(): StaticArray<u8> {
  return Storage.get(COUNTER_KEY);
}
