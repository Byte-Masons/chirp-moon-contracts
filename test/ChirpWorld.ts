import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { parseUnits } from "ethers";
import { ethers } from "hardhat";

const r1Price = 2;
const r2Price = 5;
const r3Price = 5;

describe("Chirper Economy", function () {
    async function deployContractsFixture() {
        const [deployer, user1, user2] = await ethers.getSigners();

        // Deploy ChirperCurrency (ERC20)
        const chirperCurrency = await ethers.deployContract("ChirperCurrency", [deployer]);

        // Distribute ERC20 tokens to users
        await chirperCurrency.mint(user1.address, parseUnits("20000", 18));
        await chirperCurrency.mint(user2.address, parseUnits("20000", 18));

        // Deploy ChirperResources (ERC1155)
        const chirperResources = await ethers.deployContract("ChirperResources", [await chirperCurrency.getAddress(), deployer]);

        let tx
        // Create initial resources by owner
        await chirperResources.createResource("https://example.com/resource1.json");
        const resource1Id = await chirperResources.currentTokenID() - BigInt(1)
        tx = await chirperResources.setCreationRequirements(resource1Id, [], [], parseUnits(r1Price.toString(), 18));
        tx.wait()

        await chirperResources.createResource("https://example.com/resource2.json");
        const resource2Id = await chirperResources.currentTokenID() - BigInt(1)
        tx = await chirperResources.setCreationRequirements(resource2Id, [], [], parseUnits(r2Price.toString(), 18));
        tx.wait()

        await chirperResources.createResource("https://example.com/resource3.json");
        const resource3Id = await chirperResources.currentTokenID() - BigInt(1)
        tx = await chirperResources.setCreationRequirements(resource3Id, [resource1Id, resource2Id], [3, 8], parseUnits(r3Price.toString(), 18));
        tx.wait()

        return { chirperCurrency, chirperResources, deployer, user1, user2, resource1Id, resource2Id, resource3Id };
    }

    describe("Initial Distribution", function () {
        it("Should distribute 20000 tokens to each user", async function () {
            const { chirperCurrency, user1, user2 } = await loadFixture(deployContractsFixture);

            expect(await chirperCurrency.balanceOf(user1.address)).to.equal(parseUnits("20000", 18));
            expect(await chirperCurrency.balanceOf(user2.address)).to.equal(parseUnits("20000", 18));
        });
    });

    describe("Buying and Trading Resources", async function () {

        it("User1 buys 5 x resource1Id for erc20 tokens", async function () {
            const { chirperCurrency, chirperResources, user1, user2, resource1Id } = await loadFixture(deployContractsFixture);

            const amount = 5;
            const spend = r1Price * amount;
            const expectedBalance = parseUnits((20000 - spend).toString(), 18)
            // User1 needs to approve ChirperResources contract to spend their ChirperCurrency tokens
            await chirperCurrency.connect(user1).approve(await chirperResources.getAddress(), parseUnits(spend.toString(), 18));
            await chirperResources.connect(user1).createNewResourceWithBurnAndPay(resource1Id, amount);

            // Verify ERC20 tokens were deducted from user1's balance
            expect(await chirperCurrency.balanceOf(user1.address)).to.equal(expectedBalance);
            // Verify the new resource creation
            expect(await chirperResources.balanceOf(user1.address, resource1Id)).to.equal(amount);
        });

        it("User1 buys 1 x resource3Id for erc20 tokens + other resources", async function () {
            const { chirperCurrency, chirperResources, user1, user2, resource1Id, resource2Id, resource3Id } = await loadFixture(deployContractsFixture);

            const amountr1 = 3;
            const amountr2 = 8;
            const amountr3 = 1;

            // User1 buys r1
            await chirperCurrency.connect(user1).approve(await chirperResources.getAddress(), parseUnits((r1Price * amountr1).toString(), 18));
            await chirperResources.connect(user1).createNewResourceWithBurnAndPay(resource1Id, amountr1);
            expect(await chirperResources.balanceOf(user1.address, resource1Id)).to.equal(amountr1);

            // User1 buys r2
            await chirperCurrency.connect(user1).approve(await chirperResources.getAddress(), parseUnits((r2Price * amountr2).toString(), 18));
            await chirperResources.connect(user1).createNewResourceWithBurnAndPay(resource2Id, amountr2);
            expect(await chirperResources.balanceOf(user1.address, resource2Id)).to.equal(amountr2);

            // User1 buys r3 using erc20 + required resources
            await chirperCurrency.connect(user1).approve(await chirperResources.getAddress(), parseUnits((r3Price * amountr3).toString(), 18));
            await chirperResources.connect(user1).createNewResourceWithBurnAndPay(resource3Id, amountr3);


            // Verify the new resource creation
            expect(await chirperResources.balanceOf(user1.address, resource3Id)).to.equal(amountr3);

            const expectedBalance = parseUnits((20000 - (r1Price * amountr1) - (r2Price * amountr2) - (r3Price * amountr3)).toString(), 18)
            // Verify ERC20 tokens were deducted from user1's balance
            expect(await chirperCurrency.balanceOf(user1.address)).to.equal(expectedBalance);
        });

        it("User1 buys a resource from User2", async function () {
            const { chirperCurrency, chirperResources, user1, user2, resource1Id } = await loadFixture(deployContractsFixture);
            const amount = 5;
            const spend = r1Price * amount;
            const expectedBalance = parseUnits((20000 - spend).toString(), 18)
            // User1 needs to approve ChirperResources contract to spend their ChirperCurrency tokens
            await chirperCurrency.connect(user1).approve(await chirperResources.getAddress(), parseUnits(spend.toString(), 18));
            await chirperResources.connect(user1).createNewResourceWithBurnAndPay(resource1Id, amount);

            // User1 lists a resource for sale - Assume a function or off-chain agreement
            // User2 buys resource from User1 - Simplifying the trading logic for this example
            await chirperResources.connect(user2).setApprovalForAll(user1.address, true);
            await chirperResources.connect(user1).safeTransferFrom(user1.address, user2.address, resource1Id, 1, "0x");

            // Verify ownership change
            expect(await chirperResources.balanceOf(user2.address, resource1Id)).to.equal(1);
            expect(await chirperResources.balanceOf(user1.address, resource1Id)).to.equal(4);
        });
    });

    describe("Creating New Resources", function () {
        it("Request and creation of a non-existent resource", async function () {
            const { chirperResources, deployer } = await loadFixture(deployContractsFixture);

            // Simulate user requesting a non-existent resource
            // For simplicity, we'll just directly create a new resource as an owner response to a request
            await expect(chirperResources.connect(deployer).createResource("https://example.com/resource4.json"))
                .to.emit(chirperResources, 'URI')
                .withArgs("https://example.com/resource4.json", anyValue);

            // Verify the new resource creation
            const resource4Id = await chirperResources.currentTokenID() - BigInt(1); // Assuming createResource increments the currentTokenID
            expect(await chirperResources.uri(resource4Id)).to.equal("https://example.com/resource4.json");
        });
    });

});