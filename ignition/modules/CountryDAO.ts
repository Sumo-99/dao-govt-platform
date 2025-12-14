import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NewCountryDAOModule", (m) => {
  // Deploy SoulboundCitizenID first
  const soulboundCitizenID = m.contract("SoulboundCitizenID");

  // Deploy NationToken with initial parameters
  const tokenName = m.getParameter("tokenName", "Nation Token");
  const tokenSymbol = m.getParameter("tokenSymbol", "NAT");
  const initialSupply = m.getParameter("initialSupply", 1000000); // 1 million tokens

  const nationToken = m.contract("NationToken", [
    tokenName,
    tokenSymbol,
    initialSupply,
  ]);

  // Deploy Election contract with references to the token and citizen ID
  const election = m.contract("Election", [nationToken, soulboundCitizenID]);

  // Deploy Airdropper with token and citizen ID
  const airdropper = m.contract("Airdropper", [nationToken, soulboundCitizenID]);

  return { soulboundCitizenID, nationToken, election, airdropper };
});
