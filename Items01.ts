import { Args } from '@massalabs/as-types';
import {
  _setBaseURI,
  uri,
} from '../metadata/metadata-internal';
import { onlyOwner, setOwner, ownerAddress } from '../../utils/ownership';
import { isDeployingContract } from '@massalabs/massa-as-sdk';
import { mrc721Constructor } from '../enumerable';
import {
  isApprovedForAll,
  setApprovalForAll,
  totalSupply,
  getApproved,
  approve,
  transferFrom,
  balanceOf,
  symbol,
  name,
} from '../enumerable/MRC721Enumerable';

// Additional imports for custom functionality
import { Storage, generateEvent, transferCoins, Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

// Custom constants
const BASE_URI_KEY = 'BASE_URI';
const COUNTER_KEY = 'COUNTER';
const ITEM_TYPE_KEY = 'ITEM_METADATA:';
const TOKEN_OWNER_KEY = 'TOKEN_OWNER:';
const RARITY_KEY = 'RARITY:';

const DEFAULT_XP = 0;
const DEFAULT_MAG = 0;
const DEFAULT_CONDITION = 100;

const ITEM_MAX_SUPPLY = u256.fromU32(50000);
const ITEM_PRICES: Map<string, u64> = new Map<string, u64>();
ITEM_PRICES.set('TitanRope', 80);
ITEM_PRICES.set('MagLum', 100);
ITEM_PRICES.set('NanoShelter', 350);
ITEM_PRICES.set('CrystalCondenser', 150);
ITEM_PRICES.set('CrystalSynthesizer', 500);

/**
 * Constructor function to initialize the NFT contract
 */
export function constructor(_binaryArgs: StaticArray<u8>): void {
  assert(isDeployingContract());
  const args = new Args(_binaryArgs);
  const name = args.nextString().expect('Name missing.');
  const symbol = args.nextString().expect('Symbol missing.');
  const baseURI = args.nextString().expect('Base URI missing.');

  mrc721Constructor('MW0rldItems1', 'MI1');
  _setBaseURI(baseURI);                                                  /** Nastavit defaultní URI - výchozí base URI  */
  setOwner(Context.caller().toString());

  Storage.set(BASE_URI_KEY, stringToBytes(baseURI));
  Storage.set(COUNTER_KEY, u256ToBytes(u256.Zero));
  generateEvent('NFT Collection Deployed');
}

/**
 * Set the base URI for all token IDs
 */
export function setBaseURI(_args: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(_args);
  const newBaseUri = args
    .nextString()
    .expect('newBaseUri argument is missing or invalid');

  _setBaseURI(newBaseUri);
}

/**
 * Mint a new NFT based on item type.
 */
export function mintItem(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const itemType = args.nextString().expect('Item type missing.');
  const to = args.nextString().expect('Target address missing.');

  const price = ITEM_PRICES.get(itemType);
  if (Context.caller().toString() !== ownerAddress()) {
    assert(Context.transferredCoins() >= price!, 'Not enough coins sent.');
  }

  const currentSupply = bytesToU256(
    getOrDefault(stringToBytes(COUNTER_KEY), u256ToBytes(u256.Zero))
  );
  assert(currentSupply < ITEM_MAX_SUPPLY, 'Max supply reached.');

  const newSupply = currentSupply + u256.One;
  Storage.set(COUNTER_KEY, u256ToBytes(newSupply));

  const metadataKey = ITEM_TYPE_KEY + newSupply.toString();
  const metadata = generateMetadata(itemType, newSupply);
  Storage.set(stringToBytes(metadataKey), stringToBytes(metadata));

  const ownerKey = TOKEN_OWNER_KEY + newSupply.toString();
  Storage.set(stringToBytes(ownerKey), stringToBytes(to));
  incrementBalance(to);

  generateEvent(`${itemType} minted to ${to}`);

  if (Context.transferredCoins() > 0) {
    transferCoins(new Address(ownerAddress()), Context.transferredCoins());
  }
}

/**
 * Utility to increment balance
 */
function incrementBalance(owner: string): void {
  const balanceKey = BALANCE_KEY + owner;
  const currentBalance = bytesToU256(
    getOrDefault(stringToBytes(balanceKey), u256ToBytes(u256.Zero))
  );
  Storage.set(stringToBytes(balanceKey), u256ToBytes(currentBalance + u256.One));
}

/**
 * Retrieve metadata for a specific NFT.
 */
export function tokenURI(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing.');
  const metadataKey = ITEM_TYPE_KEY + tokenId.toString();
  const baseURI = bytesToString(
    getOrDefault(stringToBytes(BASE_URI_KEY), stringToBytes(''))
  );
  const metadata = generateMetadata(
    bytesToString(
      getOrDefault(stringToBytes(metadataKey), new StaticArray<u8>(0))
    ),
    tokenId
  );

  const uri = `${baseURI}/${tokenId.toString()}?${metadata}`;
  return stringToBytes(uri);
}

/**
 * Generate metadata for NFT.
 */
function generateMetadata(itemType: string, tokenId: u256): string {
  const rarityKey = RARITY_KEY + tokenId.toString();
  const rarity = bytesToString(
    getOrDefault(stringToBytes(rarityKey), stringToBytes('Undefined'))
  );
  return `${itemType},XP=${DEFAULT_XP},MAG=${DEFAULT_MAG},CONDITION=${DEFAULT_CONDITION},RARITY=${rarity}`;
}

/**
 * Set rarity for a specific token
 */
export function setRarity(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const tokenId = args.nextU256().expect('Token ID missing.');
  const rarity = args.nextString().expect('Rarity value missing.');

  const rarityKey = RARITY_KEY + tokenId.toString();
  Storage.set(stringToBytes(rarityKey), stringToBytes(rarity));
  generateEvent(`Rarity for token ${tokenId.toString()} set to ${rarity}`);
}
