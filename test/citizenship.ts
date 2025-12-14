import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { network } from "hardhat";
import type { Address, WalletClient } from "viem";
import { getAddress } from "viem";

describe("SoulboundCitizenID", async function () {
  const { viem } = await network.connect();

  let owner: WalletClient;
  let user1: WalletClient;
  let user2: WalletClient;
  let ownerAddress: Address;
  let user1Address: Address;
  let user2Address: Address;

  before(async function () {
    const wallets = await viem.getWalletClients();
    owner = wallets[0];
    user1 = wallets[1];
    user2 = wallets[2];

    ownerAddress = getAddress(owner.account.address);
    user1Address = getAddress(user1.account.address);
    user2Address = getAddress(user2.account.address);
  });

  it("Should deploy with correct name and symbol", async function () {
    const citizenId = await viem.deployContract("SoulboundCitizenID");

    const name = await citizenId.read.name();
    const symbol = await citizenId.read.symbol();

    assert.equal(name, "CitizenID");
    assert.equal(symbol, "CID");
  });

});