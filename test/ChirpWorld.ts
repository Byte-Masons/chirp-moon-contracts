import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import constants from "constants";
import { BigNumberish, ZeroAddress, parseUnits } from "ethers";
import { ethers } from "hardhat";
const contractABI = require("./abi.json");

//connect to real contract address and get balance of 0x89a2f1d84b6ef6978b67328d229759a545cc1219

const r1Price = 2;
const r2Price = 5;
const r3Price = 5;

// describe("getRealBalance", function () {
//   async function getRealBalance() {
//     const contractAddress = "0xA4850bbc0Bc2F82a55c46D7Ae68Ba99db8dca25D";
//     const provider = new ethers.JsonRpcProvider(
//       "https://testnet.skalenodes.com/v1/aware-fake-trim-testnet"
//     );
//     const contract = new ethers.Contract(
//       contractAddress,
//       contractABI,
//       provider
//     );

//     const balance: BigNumberish = await contract.balanceOf(
//       "0x89a2f1d84b6ef6978b67328d229759a545cc1219"
//     );
//     console.log("REAL balance", balance.toString());
//     return balance;
//   }
//   it("Should distribute 20000 tokens to each user", async function () {
//     const balance = await getRealBalance();
//     console.log("REAL balance", balance.toString());
//   });
// });

describe("Chirper Economy", function () {
  async function deployContractsFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();

    // Deploy ChirperCurrency (ERC20)
    const MythiqMana = await ethers.deployContract("MythiqMana", [deployer]);

    // Deploy ChirperCurrency (ERC20)
    const chirperCurrency = await ethers.deployContract("ChirperCurrency", [
      deployer,
    ]);

    // Distribute ERC20 tokens to users
    await chirperCurrency.mint(user1.address, parseUnits("20000", 18));
    await chirperCurrency.mint(user2.address, parseUnits("20000", 18));
    await chirperCurrency.mint(deployer.address, parseUnits("20000", 18));

    // Deploy ChirperResources (ERC1155)
    const chirperResources = await ethers.deployContract("ChirperResources", [
      await chirperCurrency.getAddress(),
      deployer,
    ]);

    let tx;
    // Create initial resources by owner
    await chirperResources.createResource("https://example.com/resource1.json");
    const resource1Id = (await chirperResources.currentTokenID()) - BigInt(1);
    tx = await chirperResources.setCreationRequirements(
      resource1Id,
      [],
      [],
      parseUnits(r1Price.toString(), 18)
    );
    tx.wait();

    await chirperResources.createResource("https://example.com/resource2.json");
    const resource2Id = (await chirperResources.currentTokenID()) - BigInt(1);
    tx = await chirperResources.setCreationRequirements(
      resource2Id,
      [],
      [],
      parseUnits(r2Price.toString(), 18)
    );
    tx.wait();

    await chirperResources.createResource("https://example.com/resource3.json");
    const resource3Id = (await chirperResources.currentTokenID()) - BigInt(1);
    tx = await chirperResources.setCreationRequirements(
      resource3Id,
      [resource1Id, resource2Id],
      [3, 8],
      parseUnits(r3Price.toString(), 18)
    );
    tx.wait();

    return {
      chirperCurrency,
      chirperResources,
      deployer,
      user1,
      user2,
      resource1Id,
      resource2Id,
      resource3Id,
      MythiqMana,
    };
  }

  describe("Initial Distribution", function () {
    it("Should distribute 20000 tokens to each user", async function () {
      const { chirperCurrency, user1, user2 } = await loadFixture(
        deployContractsFixture
      );

      expect(await chirperCurrency.balanceOf(user1.address)).to.equal(
        parseUnits("20000", 18)
      );
      expect(await chirperCurrency.balanceOf(user2.address)).to.equal(
        parseUnits("20000", 18)
      );
    });
  });

  describe("Buying and Trading Resources", async function () {
    it("User1 buys 5 x resource1Id for erc20 tokens", async function () {
      const {
        chirperCurrency,
        chirperResources,
        user1,
        user2,
        resource1Id,
      } = await loadFixture(deployContractsFixture);

      const amount = 5;
      const spend = r1Price * amount;
      const expectedBalance = parseUnits((20000 - spend).toString(), 18);
      // User1 needs to approve ChirperResources contract to spend their ChirperCurrency tokens
      await chirperCurrency
        .connect(user1)
        .approve(
          await chirperResources.getAddress(),
          parseUnits(spend.toString(), 18)
        );
      await chirperResources
        .connect(user1)
        .createNewResourceWithBurnAndPay(resource1Id, amount);

      // Verify ERC20 tokens were deducted from user1's balance
      expect(await chirperCurrency.balanceOf(user1.address)).to.equal(
        expectedBalance
      );
      // Verify the new resource creation
      expect(
        await chirperResources.balanceOf(user1.address, resource1Id)
      ).to.equal(amount);
    });

    it("User1 buys 1 x resource3Id for erc20 tokens + other resources", async function () {
      const {
        chirperCurrency,
        chirperResources,
        user1,
        user2,
        resource1Id,
        resource2Id,
        resource3Id,
      } = await loadFixture(deployContractsFixture);

      const amountr1 = 3;
      const amountr2 = 8;
      const amountr3 = 1;

      // User1 buys r1
      await chirperCurrency
        .connect(user1)
        .approve(
          await chirperResources.getAddress(),
          parseUnits((r1Price * amountr1).toString(), 18)
        );
      await chirperResources
        .connect(user1)
        .createNewResourceWithBurnAndPay(resource1Id, amountr1);
      expect(
        await chirperResources.balanceOf(user1.address, resource1Id)
      ).to.equal(amountr1);

      // User1 buys r2
      await chirperCurrency
        .connect(user1)
        .approve(
          await chirperResources.getAddress(),
          parseUnits((r2Price * amountr2).toString(), 18)
        );
      await chirperResources
        .connect(user1)
        .createNewResourceWithBurnAndPay(resource2Id, amountr2);
      expect(
        await chirperResources.balanceOf(user1.address, resource2Id)
      ).to.equal(amountr2);

      // User1 buys r3 using erc20 + required resources
      await chirperCurrency
        .connect(user1)
        .approve(
          await chirperResources.getAddress(),
          parseUnits((r3Price * amountr3).toString(), 18)
        );
      await chirperResources
        .connect(user1)
        .createNewResourceWithBurnAndPay(resource3Id, amountr3);

      // Verify the new resource creation
      expect(
        await chirperResources.balanceOf(user1.address, resource3Id)
      ).to.equal(amountr3);

      const expectedBalance = parseUnits(
        (
          20000 -
          r1Price * amountr1 -
          r2Price * amountr2 -
          r3Price * amountr3
        ).toString(),
        18
      );
      // Verify ERC20 tokens were deducted from user1's balance
      expect(await chirperCurrency.balanceOf(user1.address)).to.equal(
        expectedBalance
      );
    });

    it("User1 buys a resource from User2", async function () {
      const {
        chirperCurrency,
        chirperResources,
        user1,
        user2,
        resource1Id,
      } = await loadFixture(deployContractsFixture);
      const amount = 5;
      const spend = r1Price * amount;
      const expectedBalance = parseUnits((20000 - spend).toString(), 18);
      // User1 needs to approve ChirperResources contract to spend their ChirperCurrency tokens
      await chirperCurrency
        .connect(user1)
        .approve(
          await chirperResources.getAddress(),
          parseUnits(spend.toString(), 18)
        );
      await chirperResources
        .connect(user1)
        .createNewResourceWithBurnAndPay(resource1Id, amount);

      // User1 lists a resource for sale - Assume a function or off-chain agreement
      // User2 buys resource from User1 - Simplifying the trading logic for this example
      await chirperResources
        .connect(user2)
        .setApprovalForAll(user1.address, true);
      await chirperResources
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, resource1Id, 1, "0x");

      // Verify ownership change
      expect(
        await chirperResources.balanceOf(user2.address, resource1Id)
      ).to.equal(1);
      expect(
        await chirperResources.balanceOf(user1.address, resource1Id)
      ).to.equal(4);
    });
  });

  describe("Creating New Resources", function () {
    it("Request and creation of a non-existent resource", async function () {
      const { chirperResources, deployer } = await loadFixture(
        deployContractsFixture
      );

      // Simulate user requesting a non-existent resource
      // For simplicity, we'll just directly create a new resource as an owner response to a request
      await expect(
        chirperResources
          .connect(deployer)
          .createResource("https://example.com/resource4.json")
      )
        .to.emit(chirperResources, "URI")
        .withArgs("https://example.com/resource4.json", anyValue);

      // Verify the new resource creation
      const resource4Id = (await chirperResources.currentTokenID()) - BigInt(1); // Assuming createResource increments the currentTokenID
      expect(await chirperResources.uri(resource4Id)).to.equal(
        "https://example.com/resource4.json"
      );
    });
  });

  describe("Testing Mythiq Mana", function () {
    it("Should Mint tokens to user1 and burn half", async function () {
      const { MythiqMana, user1, deployer } = await loadFixture(
        deployContractsFixture
      );

      await MythiqMana.mint(user1.address, parseUnits("20000", 18));
      expect(await MythiqMana.balanceOf(user1.address)).to.equal(
        parseUnits("20000", 18)
      );
      // Burn tokens
      await MythiqMana.burn(user1.address, parseUnits("10000", 18));
      expect(await MythiqMana.balanceOf(user1.address)).to.equal(
        parseUnits("10000", 18)
      );
    });
    it("Should Mint tokens to deployer and burn half", async function () {
      const { MythiqMana, deployer } = await loadFixture(
        deployContractsFixture
      );

      await MythiqMana.mint(deployer.address, parseUnits("20000", 18));
      expect(await MythiqMana.balanceOf(deployer.address)).to.equal(
        parseUnits("20000", 18)
      );

      // Burn tokens
      await MythiqMana.burn(deployer.address, parseUnits("10000", 18));
      expect(await MythiqMana.balanceOf(deployer.address)).to.equal(
        parseUnits("10000", 18)
      );
    });
    100000000000000000000;
  });

  describe("State Management", function () {
    it("Owner can delete creation data for a resource", async function () {
      const { chirperResources, resource1Id, deployer } = await loadFixture(
        deployContractsFixture
      );

      // Precondition check: Ensure creation data exists
      const creationBeforeDelete = await chirperResources.getCreationRequirements(
        resource1Id
      );
      expect(creationBeforeDelete.cost).to.be.above(0);

      // Perform deletion
      await expect(
        chirperResources.connect(deployer).deleteResource(resource1Id)
      )
        .to.emit(chirperResources, "ResourceDeleted") // Assuming you emit this event in your contract
        .withArgs(resource1Id);

      // Postcondition check: Creation data should be reset
      const creationAfterDelete = await chirperResources.getCreationRequirements(
        resource1Id
      );
      expect(creationAfterDelete.cost).to.equal(0);
      expect(creationAfterDelete.itemIds.length).to.equal(0);
      expect(creationAfterDelete.amounts.length).to.equal(0);
    });

    it("Non-owner cannot delete creation data", async function () {
      const { chirperResources, resource1Id, user1 } = await loadFixture(
        deployContractsFixture
      );
      await expect(chirperResources.connect(user1).deleteResource(resource1Id))
        .to.be.revertedWithCustomError(
          chirperResources,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(user1.address);
    });
  });

  describe("Batch Operations", function () {
    it("Owner can batch burn NFTs", async function () {
      const amount = 5;
      const spend = r1Price * amount;
      const expectedBalance = parseUnits((20000 - spend).toString(), 18);

      const {
        chirperResources,
        chirperCurrency,
        resource1Id,
        deployer,
      } = await loadFixture(deployContractsFixture);

      // Precondition check: Ensure deployer has chirperCurrency tokens
      let balance = await chirperCurrency.balanceOf(deployer.address);
      expect(balance).to.equal(parseUnits("20000", 18));

      // Deployer needs to approve ChirperResources contract to spend their ChirperCurrency tokens
      await chirperCurrency
        .connect(deployer)
        .approve(
          await chirperResources.getAddress(),
          parseUnits(spend.toString(), 18)
        );

      await chirperResources
        .connect(deployer)
        .createNewResourceWithBurnAndPay(resource1Id, amount);

      // Precondition check: Ensure tokens are minted
      expect(
        await chirperResources.balanceOf(deployer.address, resource1Id)
      ).to.equal(amount);

      // Perform batch burn
      await expect(
        chirperResources
          .connect(deployer)
          .batchBurnNFTs([resource1Id], [amount])
      )
        .to.emit(chirperResources, "TokensBatchBurned")
        .withArgs(deployer.address, [resource1Id], [amount]);

      // Postcondition check: Tokens should be burned
      expect(
        await chirperResources.balanceOf(deployer.address, resource1Id)
      ).to.equal(0);
    });

    it("Non-owner cannot batch burn NFTs", async function () {
      const { chirperResources, resource1Id, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Attempt batch burn by non-owner
      await expect(
        chirperResources.connect(user1).batchBurnNFTs([resource1Id], [5])
      )
        .to.be.revertedWithCustomError(
          chirperResources,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(user1.address);
    });
  });
});
