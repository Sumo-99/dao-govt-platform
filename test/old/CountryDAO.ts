import assert from "node:assert/strict";
import { describe, it, before, beforeEach } from "node:test";

import { network } from "hardhat";
import type { Address, WalletClient } from "viem";
import { getAddress } from "viem";

describe("CountryDAO", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  let owner: WalletClient;
  let member1: WalletClient;
  let member2: WalletClient;
  let member3: WalletClient;
  let ownerAddress: Address;
  let member1Address: Address;
  let member2Address: Address;
  let member3Address: Address;

  before(async function () {
    const wallets = await viem.getWalletClients();
    owner = wallets[0];
    member1 = wallets[1];
    member2 = wallets[2];
    member3 = wallets[3];

    ownerAddress = getAddress(owner.account.address);
    member1Address = getAddress(member1.account.address);
    member2Address = getAddress(member2.account.address);
    member3Address = getAddress(member3.account.address);
  });

  describe("Member Registration", function () {
    it("Should register a new member", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });

      const member = await countryDAO.read.members([member1Address]);
      assert.equal(member[2], true); // isRegistered
      assert.equal(member[1], "Alice"); // name

      const memberCount = await countryDAO.read.getMemberCount();
      assert.equal(memberCount, 1n);
    });

    it("Should not allow duplicate registration", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });

      await assert.rejects(
        async () => countryDAO.write.registerMember(["Alice Again"], { account: member1.account }),
        /Already registered/
      );
    });

    it("Should not allow empty name", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await assert.rejects(
        async () => countryDAO.write.registerMember([""], { account: member1.account }),
        /Name cannot be empty/
      );
    });

    it("Should emit MemberRegistered event", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await viem.assertions.emitWithArgs(
        countryDAO.write.registerMember(["Alice"], { account: member1.account }),
        countryDAO,
        "MemberRegistered",
        [member1Address, "Alice"]
      );
    });
  });

  describe("Candidate Nomination", function () {
    it("Should allow member to nominate a candidate", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });

      const candidate = await countryDAO.read.candidates([0n]);
      assert.equal(candidate[0], member1Address); // candidateAddress
      assert.equal(candidate[2], 0); // role (President)
      assert.equal(candidate[3], 0n); // voteCount
    });

    it("Should not allow non-member to nominate", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });

      await assert.rejects(
        async () => countryDAO.write.nominateCandidate([member1Address, 0], { account: member3.account }),
        /Only registered members can call this/
      );
    });

    it("Should not allow nomination of non-member", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });

      await assert.rejects(
        async () => countryDAO.write.nominateCandidate([member3Address, 0], { account: member1.account }),
        /Candidate must be a registered member/
      );
    });

    it("Should not allow nomination during active election", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });

      await assert.rejects(
        async () => countryDAO.write.nominateCandidate([member2Address, 1], { account: member2.account }),
        /Election is currently active/
      );
    });

    it("Should emit CandidateNominated event", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });

      await viem.assertions.emitWithArgs(
        countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account }),
        countryDAO,
        "CandidateNominated",
        [member1Address, "Alice", 0, 0n]
      );
    });
  });

  describe("Election Management", function () {
    it("Should start election", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });

      await countryDAO.write.startElection([], { account: owner.account });

      const electionActive = await countryDAO.read.electionActive();
      assert.equal(electionActive, true);
    });

    it("Should not start election without candidates", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await assert.rejects(
        async () => countryDAO.write.startElection([], { account: owner.account }),
        /No candidates nominated/
      );
    });

    it("Should only allow owner to start election", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });

      await assert.rejects(
        async () => countryDAO.write.startElection([], { account: member1.account }),
        /Only owner can call this/
      );
    });

    it("Should end election", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });
      await countryDAO.write.endElection([], { account: owner.account });

      const electionActive = await countryDAO.read.electionActive();
      assert.equal(electionActive, false);
    });

    it("Should emit ElectionStarted event", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });

      await viem.assertions.emitWithArgs(
        countryDAO.write.startElection([], { account: owner.account }),
        countryDAO,
        "ElectionStarted",
        []
      );
    });

    it("Should emit ElectionEnded event", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });

      await viem.assertions.emitWithArgs(
        countryDAO.write.endElection([], { account: owner.account }),
        countryDAO,
        "ElectionEnded",
        []
      );
    });
  });

  describe("Voting", function () {
    it("Should allow member to vote", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });
      await countryDAO.write.registerMember(["Charlie"], { account: member3.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.nominateCandidate([member2Address, 0], { account: member2.account });

      await countryDAO.write.startElection([], { account: owner.account });

      await countryDAO.write.vote([0n], { account: member1.account });

      const candidate = await countryDAO.read.candidates([0n]);
      assert.equal(candidate[3], 1n); // voteCount

      const hasVoted = await countryDAO.read.hasVoted([member1Address]);
      assert.equal(hasVoted, true);
    });

    it("Should not allow double voting", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.nominateCandidate([member2Address, 0], { account: member2.account });

      await countryDAO.write.startElection([], { account: owner.account });
      await countryDAO.write.vote([0n], { account: member1.account });

      await assert.rejects(
        async () => countryDAO.write.vote([1n], { account: member1.account }),
        /Already voted/
      );
    });

    it("Should not allow non-member to vote", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });

      const wallets = await viem.getWalletClients();
      const nonMember = wallets[4];

      await assert.rejects(
        async () => countryDAO.write.vote([0n], { account: nonMember.account }),
        /Only registered members can call this/
      );
    });

    it("Should not allow voting when election is inactive", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });
      await countryDAO.write.registerMember(["Charlie"], { account: member3.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });
      await countryDAO.write.endElection([], { account: owner.account });

      await assert.rejects(
        async () => countryDAO.write.vote([0n], { account: member3.account }),
        /Election is not active/
      );
    });

    it("Should not allow voting for invalid candidate", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });

      await assert.rejects(
        async () => countryDAO.write.vote([999n], { account: member1.account }),
        /Invalid candidate/
      );
    });

    it("Should emit VoteCast event", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });

      await viem.assertions.emitWithArgs(
        countryDAO.write.vote([0n], { account: member1.account }),
        countryDAO,
        "VoteCast",
        [member1Address, 0n]
      );
    });
  });

  describe("Results and Winners", function () {
    it("Should declare correct winner", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });
      await countryDAO.write.registerMember(["Charlie"], { account: member3.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.nominateCandidate([member2Address, 0], { account: member2.account });
      await countryDAO.write.nominateCandidate([member3Address, 1], { account: member1.account });

      await countryDAO.write.startElection([], { account: owner.account });

      await countryDAO.write.vote([0n], { account: member1.account });
      await countryDAO.write.vote([1n], { account: member2.account });
      await countryDAO.write.vote([0n], { account: member3.account });

      await countryDAO.write.endElection([], { account: owner.account });

      const presidentWinner = await countryDAO.read.getWinner([0]);
      assert.equal(presidentWinner, member1Address);
    });

    it("Should emit WinnerDeclared event", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");
      const deploymentBlockNumber = await publicClient.getBlockNumber();

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.nominateCandidate([member2Address, 1], { account: member1.account });

      await countryDAO.write.startElection([], { account: owner.account });
      await countryDAO.write.vote([0n], { account: member1.account });
      await countryDAO.write.endElection([], { account: owner.account });

      const events = await publicClient.getContractEvents({
        address: countryDAO.address,
        abi: countryDAO.abi,
        eventName: "WinnerDeclared",
        fromBlock: deploymentBlockNumber,
        strict: true,
      });

      assert(events.length > 0);
    });

    it("Should get candidates by role", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });
      await countryDAO.write.registerMember(["Charlie"], { account: member3.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.nominateCandidate([member2Address, 0], { account: member2.account });
      await countryDAO.write.nominateCandidate([member3Address, 1], { account: member1.account });

      await countryDAO.write.startElection([], { account: owner.account });
      await countryDAO.write.vote([0n], { account: member1.account });

      const presidentCandidates = await countryDAO.read.getCandidatesByRole([0]);
      assert.equal(presidentCandidates.length, 2);

      const ministerCandidates = await countryDAO.read.getCandidatesByRole([1]);
      assert.equal(ministerCandidates.length, 1);
    });

    it("Should get all candidates", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });
      await countryDAO.write.registerMember(["Charlie"], { account: member3.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.nominateCandidate([member2Address, 0], { account: member2.account });
      await countryDAO.write.nominateCandidate([member3Address, 1], { account: member1.account });

      const allCandidates = await countryDAO.read.getAllCandidates();
      assert.equal(allCandidates.length, 3);
    });
  });

  describe("Reset Election", function () {
    it("Should reset election data", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.registerMember(["Bob"], { account: member2.account });

      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });
      await countryDAO.write.vote([0n], { account: member1.account });
      await countryDAO.write.endElection([], { account: owner.account });

      await countryDAO.write.resetElection([], { account: owner.account });

      const candidateCount = await countryDAO.read.candidateCount();
      assert.equal(candidateCount, 0n);

      const hasVoted = await countryDAO.read.hasVoted([member1Address]);
      assert.equal(hasVoted, false);

      const winner = await countryDAO.read.getWinner([0]);
      assert.equal(winner, "0x0000000000000000000000000000000000000000");
    });

    it("Should only allow owner to reset", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });
      await countryDAO.write.endElection([], { account: owner.account });

      await assert.rejects(
        async () => countryDAO.write.resetElection([], { account: member1.account }),
        /Only owner can call this/
      );
    });

    it("Should not allow reset during active election", async function () {
      const countryDAO = await viem.deployContract("CountryDAO");

      await countryDAO.write.registerMember(["Alice"], { account: member1.account });
      await countryDAO.write.nominateCandidate([member1Address, 0], { account: member1.account });
      await countryDAO.write.startElection([], { account: owner.account });

      await assert.rejects(
        async () => countryDAO.write.resetElection([], { account: owner.account }),
        /Election is currently active/
      );
    });
  });
});
