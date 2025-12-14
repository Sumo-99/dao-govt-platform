import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { network } from "hardhat";
import type { Address, WalletClient } from "viem";
import { getAddress, parseEther } from "viem";

describe("Election", async function () {
  const { viem } = await network.connect();

  let owner: WalletClient;
  let voter1: WalletClient;
  let voter2: WalletClient;
  let candidate1: WalletClient;
  let candidate2: WalletClient;
  let ownerAddress: Address;
  let voter1Address: Address;
  let voter2Address: Address;
  let candidate1Address: Address;
  let candidate2Address: Address;

  let token: any;
  let citizenId: any;
  let election: any;

  before(async function () {
    const wallets = await viem.getWalletClients();
    owner = wallets[0];
    voter1 = wallets[1];
    voter2 = wallets[2];
    candidate1 = wallets[3];
    candidate2 = wallets[4];

    ownerAddress = getAddress(owner.account.address);
    voter1Address = getAddress(voter1.account.address);
    voter2Address = getAddress(voter2.account.address);
    candidate1Address = getAddress(candidate1.account.address);
    candidate2Address = getAddress(candidate2.account.address);

    // Deploy dependencies
    token = await viem.deployContract("NationToken", [
      "Nation Token",
      "NAT",
      0n,
    ]);

    citizenId = await viem.deployContract("SoulboundCitizenID");

    election = await viem.deployContract("Election", [
      token.address,
      citizenId.address,
    ]);
  });

  describe("Deployment", function () {
    it("Should deploy with correct token and citizen ID addresses", async function () {
      const tokenAddr = await election.read.nationToken();
      const citizenAddr = await election.read.citizenId();

      assert.equal(getAddress(tokenAddr), getAddress(token.address));
      assert.equal(getAddress(citizenAddr), getAddress(citizenId.address));
    });

    it("Should set deployer as owner", async function () {
      const contractOwner = await election.read.owner();
      assert.equal(getAddress(contractOwner), ownerAddress);
    });
  });

  describe("Position Management", function () {
    it("Should allow owner to create position", async function () {
      await election.write.createPosition([1n, "President", []], { account: owner.account });

      const position = await election.read.positions([1n]);
      assert.equal(position[0], "President");
      assert.equal(position[1], true); // active
      assert.equal(position[2], true); // exists
    });

    it("Should not allow duplicate position creation", async function () {
      // Use a fresh positionId that hasn't been created yet
      await election.write.createPosition([100n, "President", []], { account: owner.account });

      await assert.rejects(
        async () => election.write.createPosition([100n, "President Again", []], { account: owner.account }),
        /exists/
      );
    });

    it("Should not allow non-owner to create position", async function () {
      await assert.rejects(
        async () => election.write.createPosition([2n, "Minister", []], { account: voter1.account }),
        /not owner/
      );
    });

    it("Should create position with initial candidates", async function () {
      await election.write.createPosition(
        [3n, "Minister", [candidate1Address, candidate2Address]],
        { account: owner.account }
      );

      const candidates = await election.read.getCandidates([3n]);
      assert.equal(candidates.length, 2);
      assert.equal(getAddress(candidates[0]), candidate1Address);
      assert.equal(getAddress(candidates[1]), candidate2Address);
    });

    it("Should allow owner to close position", async function () {
      await election.write.createPosition([4n, "Treasurer", []], { account: owner.account });
      await election.write.closePosition([4n], { account: owner.account });

      const position = await election.read.positions([4n]);
      assert.equal(position[1], false); // active = false
    });

    it("Should not allow closing non-existent position", async function () {
      await assert.rejects(
        async () => election.write.closePosition([999n], { account: owner.account }),
        /no position/
      );
    });
  });

  describe("Candidate Management", function () {
    it("Should allow owner to add candidate to position", async function () {
      await election.write.createPosition([5n, "Secretary", []], { account: owner.account });
      await election.write.addCandidate([5n, candidate1Address], { account: owner.account });

      const candidates = await election.read.getCandidates([5n]);
      assert.equal(candidates.length, 1);
      assert.equal(getAddress(candidates[0]), candidate1Address);

      const isCandidate = await election.read.isCandidate([5n, candidate1Address]);
      assert.equal(isCandidate, true);
    });

    it("Should not allow adding candidate to non-existent position", async function () {
      await assert.rejects(
        async () => election.write.addCandidate([999n, candidate1Address], { account: owner.account }),
        /no position/
      );
    });

    it("Should not allow duplicate candidates", async function () {
      await election.write.createPosition([6n, "Advisor", []], { account: owner.account });
      await election.write.addCandidate([6n, candidate1Address], { account: owner.account });

      await assert.rejects(
        async () => election.write.addCandidate([6n, candidate1Address], { account: owner.account }),
        /already candidate/
      );
    });

    it("Should not allow zero address as candidate", async function () {
      await election.write.createPosition([7n, "Counselor", []], { account: owner.account });

      await assert.rejects(
        async () => election.write.addCandidate([7n, "0x0000000000000000000000000000000000000000"], { account: owner.account }),
        /zero addr/
      );
    });

    it("Should not allow non-owner to add candidate", async function () {
      await election.write.createPosition([8n, "Director", []], { account: owner.account });

      await assert.rejects(
        async () => election.write.addCandidate([8n, candidate1Address], { account: voter1.account }),
        /not owner/
      );
    });
  });

  describe("Voting", function () {
    it("Should allow eligible voter to vote", async function () {
      // Setup: Create position and prepare eligible voters
      await election.write.createPosition([10n, "President", [candidate1Address, candidate2Address]], {
        account: owner.account,
      });

      // Check and mint CitizenID only if needed
      const citizenBalance1 = await citizenId.read.balanceOf([voter1Address]);
      if (citizenBalance1 === 0n) {
        await citizenId.write.mintCitizen([voter1Address], { account: owner.account });
      }
      const citizenBalance2 = await citizenId.read.balanceOf([voter2Address]);
      if (citizenBalance2 === 0n) {
        await citizenId.write.mintCitizen([voter2Address], { account: owner.account });
      }
      
      // Mint tokens
      await token.write.mintTo([voter1Address, 100n], { account: owner.account });
      await token.write.mintTo([voter2Address, 100n], { account: owner.account });

      await election.write.vote([10n, candidate1Address], { account: voter1.account });

      const votes = await election.read.votes([10n, candidate1Address]);
      assert.equal(votes, 1n);

      const hasVoted = await election.read.hasVoted([10n, voter1Address]);
      assert.equal(hasVoted, true);
    });

    it("Should not allow voting without CitizenID", async function () {
      // Setup
      await election.write.createPosition([11n, "President", [candidate1Address]], {
        account: owner.account,
      });

      // Create a new voter without CitizenID
      const wallets = await viem.getWalletClients();
      const newVoter = wallets[5];
      await token.write.mintTo([newVoter.account.address, 100n], { account: owner.account });

      await assert.rejects(
        async () => election.write.vote([11n, candidate1Address], { account: newVoter.account }),
        /not a citizen/
      );
    });

    it("Should not allow voting without tokens", async function () {
      // Setup
      await election.write.createPosition([12n, "President", [candidate1Address]], {
        account: owner.account,
      });

      // Use a fresh wallet that definitely doesn't have tokens
      const wallets = await viem.getWalletClients();
      const newVoter = wallets[6]; // Use wallet[6] instead of voter1
      
      // Only mint CitizenID, NOT tokens
      const citizenBalance = await citizenId.read.balanceOf([newVoter.account.address]);
      if (citizenBalance === 0n) {
        await citizenId.write.mintCitizen([newVoter.account.address], { account: owner.account });
      }

      await assert.rejects(
        async () => election.write.vote([12n, candidate1Address], { account: newVoter.account }),
        /no tokens/
      );
    });

    it("Should not allow voting for non-candidate", async function () {
      // Setup
      await election.write.createPosition([13n, "President", [candidate1Address]], {
        account: owner.account,
      });
      
      // Use fresh wallets
      const wallets = await viem.getWalletClients();
      const newVoter = wallets[7];
      
      const citizenBalance = await citizenId.read.balanceOf([newVoter.account.address]);
      if (citizenBalance === 0n) {
        await citizenId.write.mintCitizen([newVoter.account.address], { account: owner.account });
      }
      await token.write.mintTo([newVoter.account.address, 100n], { account: owner.account });

      await assert.rejects(
        async () => election.write.vote([13n, newVoter.account.address], { account: newVoter.account }),
        /not a candidate/
      );
    });

    it("Should not allow voting for non-existent position", async function () {
      // Use fresh wallets
      const wallets = await viem.getWalletClients();
      const newVoter = wallets[8];
      
      const citizenBalance = await citizenId.read.balanceOf([newVoter.account.address]);
      if (citizenBalance === 0n) {
        await citizenId.write.mintCitizen([newVoter.account.address], { account: owner.account });
      }
      await token.write.mintTo([newVoter.account.address, 100n], { account: owner.account });

      await assert.rejects(
        async () => election.write.vote([999n, candidate1Address], { account: newVoter.account }),
        /no position/
      );
    });

    it("Should not allow voting on closed position", async function () {
      // Setup
      await election.write.createPosition([14n, "President", [candidate1Address]], {
        account: owner.account,
      });
      
      const wallets = await viem.getWalletClients();
      const newVoter = wallets[9];
      
      const citizenBalance = await citizenId.read.balanceOf([newVoter.account.address]);
      if (citizenBalance === 0n) {
        await citizenId.write.mintCitizen([newVoter.account.address], { account: owner.account });
      }
      await token.write.mintTo([newVoter.account.address, 100n], { account: owner.account });
      await election.write.closePosition([14n], { account: owner.account });

      await assert.rejects(
        async () => election.write.vote([14n, candidate1Address], { account: newVoter.account }),
        /closed/
      );
    });

    it("Should not allow double voting", async function () {
      // Setup
      await election.write.createPosition([15n, "President", [candidate1Address, candidate2Address]], {
        account: owner.account,
      });
      
      const wallets = await viem.getWalletClients();
      const newVoter = wallets[10];
      
      const citizenBalance = await citizenId.read.balanceOf([newVoter.account.address]);
      if (citizenBalance === 0n) {
        await citizenId.write.mintCitizen([newVoter.account.address], { account: owner.account });
      }
      await token.write.mintTo([newVoter.account.address, 100n], { account: owner.account });

      await election.write.vote([15n, candidate1Address], { account: newVoter.account });

      await assert.rejects(
        async () => election.write.vote([15n, candidate2Address], { account: newVoter.account }),
        /already voted/
      );
    });

    it("Should track votes correctly for multiple voters", async function () {
      // Setup
      await election.write.createPosition([16n, "President", [candidate1Address]], {
        account: owner.account,
      });
      
      const wallets = await viem.getWalletClients();
      const voterA = wallets[11];
      const voterB = wallets[12];
      
      // Setup voterA
      const citizenBalanceA = await citizenId.read.balanceOf([voterA.account.address]);
      if (citizenBalanceA === 0n) {
        await citizenId.write.mintCitizen([voterA.account.address], { account: owner.account });
      }
      await token.write.mintTo([voterA.account.address, 100n], { account: owner.account });
      
      // Setup voterB
      const citizenBalanceB = await citizenId.read.balanceOf([voterB.account.address]);
      if (citizenBalanceB === 0n) {
        await citizenId.write.mintCitizen([voterB.account.address], { account: owner.account });
      }
      await token.write.mintTo([voterB.account.address, 100n], { account: owner.account });

      await election.write.vote([16n, candidate1Address], { account: voterA.account });
      await election.write.vote([16n, candidate1Address], { account: voterB.account });

      const votes = await election.read.votes([16n, candidate1Address]);
      assert.equal(votes, 2n);
    });
  });

  describe("Winner Calculation", function () {
    it("Should return candidate with most votes", async function () {
      // Setup
      await election.write.createPosition([20n, "President", [candidate1Address, candidate2Address]], {
        account: owner.account,
      });
      
      const wallets = await viem.getWalletClients();
      const voterA = wallets[13];
      const voterB = wallets[14];
      
      // Setup voters
      const citizenBalanceA = await citizenId.read.balanceOf([voterA.account.address]);
      if (citizenBalanceA === 0n) {
        await citizenId.write.mintCitizen([voterA.account.address], { account: owner.account });
      }
      const citizenBalanceB = await citizenId.read.balanceOf([voterB.account.address]);
      if (citizenBalanceB === 0n) {
        await citizenId.write.mintCitizen([voterB.account.address], { account: owner.account });
      }
      await token.write.mintTo([voterA.account.address, 100n], { account: owner.account });
      await token.write.mintTo([voterB.account.address, 100n], { account: owner.account });

      await election.write.vote([20n, candidate1Address], { account: voterA.account });
      await election.write.vote([20n, candidate1Address], { account: voterB.account });

      const [winner, voteCount] = await election.read.currentWinner([20n]);
      assert.equal(getAddress(winner), candidate1Address);
      assert.equal(voteCount, 2n);
    });

    it("Should return zero address and zero votes for position with no votes", async function () {
      // Setup
      await election.write.createPosition([21n, "President", [candidate1Address]], {
        account: owner.account,
      });

      const [winner, voteCount] = await election.read.currentWinner([21n]);
      assert.equal(getAddress(winner), "0x0000000000000000000000000000000000000000");
      assert.equal(voteCount, 0n);
    });

    it("Should handle tie correctly", async function () {
      // Setup
      await election.write.createPosition([22n, "President", [candidate1Address, candidate2Address]], {
        account: owner.account,
      });
      
      const wallets = await viem.getWalletClients();
      const voterA = wallets[15];
      const voterB = wallets[16];
      
      // Setup voters
      const citizenBalanceA = await citizenId.read.balanceOf([voterA.account.address]);
      if (citizenBalanceA === 0n) {
        await citizenId.write.mintCitizen([voterA.account.address], { account: owner.account });
      }
      const citizenBalanceB = await citizenId.read.balanceOf([voterB.account.address]);
      if (citizenBalanceB === 0n) {
        await citizenId.write.mintCitizen([voterB.account.address], { account: owner.account });
      }
      await token.write.mintTo([voterA.account.address, 100n], { account: owner.account });
      await token.write.mintTo([voterB.account.address, 100n], { account: owner.account });

      await election.write.vote([22n, candidate1Address], { account: voterA.account });
      await election.write.vote([22n, candidate2Address], { account: voterB.account });

      const [winner, voteCount] = await election.read.currentWinner([22n]);
      // In case of tie, it returns the first candidate with max votes (first in list)
      assert.equal(voteCount, 1n);
      // Winner could be either candidate depending on iteration order
      assert.ok(
        getAddress(winner) === candidate1Address || getAddress(winner) === candidate2Address
      );
    });

    it("Should not allow winner query for non-existent position", async function () {
      await assert.rejects(
        async () => election.read.currentWinner([999n]),
        /no position/
      );
    });
  });

  describe("Ownership Transfer", function () {
    it("Should allow owner to transfer ownership", async function () {
      await election.write.transferOwnership([voter1Address], { account: owner.account });

      const newOwner = await election.read.owner();
      assert.equal(getAddress(newOwner), voter1Address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      // After previous test, voter1 is now owner, so use voter2
      await assert.rejects(
        async () => election.write.transferOwnership([voter2Address], { account: voter2.account }),
        /not owner/
      );
    });

    it("Should not allow transfer to zero address", async function () {
      // voter1 is now owner from first test, use voter1 account
      await assert.rejects(
        async () => election.write.transferOwnership(["0x0000000000000000000000000000000000000000"], { account: voter1.account }),
        /zero addr/
      );
    });
  });
});
