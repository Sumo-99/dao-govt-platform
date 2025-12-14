import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { network } from "hardhat";
import type { Address, WalletClient } from "viem";
import { getAddress, parseEther } from "viem";

describe("NationToken", async function () {
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
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      0n,
    ]);

    const name = await token.read.name();
    const symbol = await token.read.symbol();
    const decimals = await token.read.decimals();

    assert.equal(name, "Nation Token");
    assert.equal(symbol, "NAT");
    assert.equal(decimals, 18);
  });

  it("Should deploy with initial supply minted to deployer", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      1000n, // 1000 whole tokens
    ]);

    const balance = await token.read.balanceOf([ownerAddress]);
    assert.equal(balance, parseEther("1000")); // 1000 * 10^18
  });

  it("Should deploy with zero supply if initialSupply is 0", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      0n,
    ]);

    const balance = await token.read.balanceOf([ownerAddress]);
    assert.equal(balance, 0n);
  });

  it("Should allow owner to mint tokens", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      0n,
    ]);

    await token.write.mintTo([user1Address, 100n], { account: owner.account });

    const balance = await token.read.balanceOf([user1Address]);
    assert.equal(balance, parseEther("100"));
  });

  it("Should not allow non-minter to mint", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      0n,
    ]);

    await assert.rejects(
      async () => token.write.mintTo([user1Address, 100n], { account: user1.account }),
      /AccessControl/
    );
  });

  it("Should allow standard ERC20 transfers", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      1000n,
    ]);

    await token.write.transfer([user1Address, parseEther("100")], { account: owner.account });

    const user1Balance = await token.read.balanceOf([user1Address]);
    const ownerBalance = await token.read.balanceOf([ownerAddress]);

    assert.equal(user1Balance, parseEther("100"));
    assert.equal(ownerBalance, parseEther("900"));
  });

  it("Should not allow transfers exceeding balance", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      100n,
    ]);

    await assert.rejects(
      async () => token.write.transfer([user1Address, parseEther("200")], { account: owner.account }),
      /ERC20: transfer amount exceeds balance/
    );
  });

  it("Should allow owner to sweep tokens from contract", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      0n,
    ]);

    // Mint tokens to the contract itself
    await token.write.mintTo([token.address, 50n], { account: owner.account });

    // Sweep them out
    await token.write.sweepSelf([user1Address], { account: owner.account });

    const balance = await token.read.balanceOf([user1Address]);
    assert.equal(balance, parseEther("50"));
  });

  it("Should not allow non-admin to sweep", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      0n,
    ]);

    await token.write.mintTo([token.address, 50n], { account: owner.account });

    await assert.rejects(
      async () => token.write.sweepSelf([user1Address], { account: user1.account }),
      /AccessControl/
    );
  });

  it("Should have MINTER_ROLE constant", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      0n,
    ]);

    const minterRole = await token.read.MINTER_ROLE();
    // MINTER_ROLE should be keccak256("MINTER_ROLE")
    assert.ok(minterRole !== "0x0000000000000000000000000000000000000000000000000000000000000000");
  });

  it("Should track total supply correctly", async function () {
    const token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      1000n,
    ]);

    let totalSupply = await token.read.totalSupply();
    assert.equal(totalSupply, parseEther("1000"));

    await token.write.mintTo([user1Address, 500n], { account: owner.account });

    totalSupply = await token.read.totalSupply();
    assert.equal(totalSupply, parseEther("1500"));
  });
});
