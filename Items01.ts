import {
  Args,
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

// Define constants for storage keys
const BASE_URI_KEY = stringToBytes('BASE_URI');
const MAX_SUPPLY_KEY = stringToBytes('MAX_SUPPLY');
const COUNTER_KEY = stringToBytes('COUNTER');
const MINT_PRICE_KEY = stringToBytes('MINT_PRICE');

// Define properties for each NFT type
const PROPERTIES_KEY = (tokenId: u256): StaticArray<u8> => stringToBytes(`PROPERTIES_${tokenId.toString()}`);

// Define NFT types and their prices
const NFT_TYPES: Map<string, u64> = new Map<string, u64>([
  ['TitanRope', u64.fromU32(80)],
  ['MagLum', u64.fromU32(100)],
  ['NanoShelter', u64.fromU32(350)],
  ['CrystalCondenser', u64.fromU32(150)],
  ['CrystalSynthesizer', u64.fromU32(500)],
]);

/**
 * Constructor function for initializing the contract
 * @param binaryArgs - serialized strings representing the name and the symbol of the NFT
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(isDeployingContract());
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('name argument is missing or invalid');
  const symbol = args.nextString().expect('symbol argument is missing or invalid');
  _constructor(name, symbol);
  const owner = args.nextString().expect('owner argument is missing or invalid');
  setOwner(new Args().add(owner).serialize());
  const baseURI = args.nextString().expect('baseURI argument is missing or invalid');

  Storage.set(BASE_URI_KEY, stringToBytes(baseURI));
  Storage.set(MAX_SUPPLY_KEY, u256ToBytes(u256.fromU32(5000))); // Total supply limit per NFT type
  Storage.set(COUNTER_KEY, u256ToBytes(u256.Zero));

  generateEvent('NFT COLLECTION IS DEPLOYED');
}

// ... (Keep other functions like name, symbol, baseURI, tokenURI, setBaseURI, balanceOf, ownerOf, getApproved, isApprovedForAll, approve, setApprovalForAll, transferFrom)

/**
 * Mint a specific type of NFT
 * @param binaryArgs - serialized strings representing the NFT type and recipient address
 */
export function mint(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const nftType = args.nextString().expect('NFT type is missing');
  const to = args.nextString().expect('Recipient address is missing');
  
  const currentSupply = bytesToU256(Storage.get(COUNTER_KEY));
  const maxSupply = bytesToU256(Storage.get(MAX_SUPPLY_KEY));

  assert(currentSupply < maxSupply, 'Max supply reached for this NFT type');

  const mintPrice = NFT_TYPES.get(nftType);

  if (!isOwner()) {
    assert(
      Context.transferredCoins() >= (mintPrice ? mintPrice : u64.Zero),
      'You did not cover the mint fee, please send coins'
    );
    // Transfer coins to owner if not an admin mint
    transferCoins(new Address(bytesToString(ownerAddress([]))), Context.transferredCoins());
  }

  const newId = currentSupply + u256.One;
  Storage.set(COUNTER_KEY, u256ToBytes(newId));
  _update(to, newId, '');
  
  // Initialize properties for new NFT
  const properties = ${nftType}#${newId.toString()} - XP=0 - Mag=0 - Condition=100;
  Storage.set(PROPERTIES_KEY(newId), stringToBytes(properties));

  generateEvent(`Minted ${nftType}#${newId.toString()} to ${to}`);
}

/**
 * Edit metadata of an NFT
 * @param binaryArgs - serialized strings representing the NFT identifier, property, and new value
 */
export function editmetadata(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const nftId = args.nextString().expect('NFT identifier is missing');
  const property = args.nextString().expect('Property to change is missing');
  const newValue = args.nextString().expect('New value is missing');

  let parts = nftId.split('#');
  let tokenId = u256.fromString(parts[1]);
  let properties = bytesToString(Storage.get(PROPERTIES_KEY(tokenId)));
  
  // Update specific property
  const regex = new RegExp(`${property}=\\d+`);
  properties = properties.replace(regex, `${property}=${newValue}`);

  Storage.set(PROPERTIES_KEY(tokenId), stringToBytes(properties));
  generateEvent(`Updated ${nftId} property ${property} to ${newValue}`);
}

function isOwner(): bool {
  return Context.caller().toString() == bytesToString(Storage.get(ownerAddress([])));
}
