import { ethers, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  let nonce = await deployer.getNonce();
  console.log("Nonce: ", nonce);
  // Correctly obtaining a contract factory and deploying
  const MythiqMana = await ethers.deployContract("MythiqMana", [deployer.address], {
    gasLimit: 100000000,
  });
  await MythiqMana.waitForDeployment(); // Use deployed() to wait for the contract to be deployed
  run("verify:verify", {
    address: MythiqMana.target,
    constructorArguments: [deployer.address],
  });

  const chirperCurrency = await ethers.deployContract("ChirperCurrency", [deployer.address], {
    gasLimit: 8000000,
  });
  await chirperCurrency.waitForDeployment(); // Use deployed() to wait for the contract to be deployed

  run("verify:verify", {
    address: chirperCurrency.target,
    constructorArguments: [deployer.address],
  });

  const chirperResources = await ethers.deployContract("ChirperResources", [await chirperCurrency.getAddress(), deployer.address], {
    gasLimit: 8000000,
  });
  await chirperResources.waitForDeployment(); // Use deployed() to wait for the contract to be deployed

  run("verify:verify", {
    address: chirperResources.target,
    constructorArguments: [await chirperCurrency.getAddress(), deployer.address],
  });
  console.log(`chirperCurrency deployed to: ${chirperCurrency.target}`);
  console.log(`chirperResources deployed to: ${chirperResources.target}`);
  console.log(`MythiqMana deployed to: ${MythiqMana.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});