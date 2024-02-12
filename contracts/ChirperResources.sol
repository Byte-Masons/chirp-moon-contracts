// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

contract ChirperResources is ERC1155, Ownable {
    using EnumerableMap for EnumerableMap.UintToUintMap;

    uint256 public currentTokenID = 0;
    mapping(uint256 => string) private tokenURIs;
    mapping(uint256 => EnumerableMap.UintToUintMap) private creationRequirements; // Mapping for creation requirements
    mapping(uint256 => uint256) private creationCosts; // New mapping for ERC20 costs
    IERC20 public chirperCurrency; // ERC20 token

    constructor(IERC20 _chirperCurrency, address initialOwner) ERC1155("") Ownable(initialOwner) {
        chirperCurrency = _chirperCurrency;
    }

    function setURI(uint256 tokenId, string memory newuri) public onlyOwner {
        require(bytes(tokenURIs[tokenId]).length == 0, "URI already set");
        tokenURIs[tokenId] = newuri;
        emit URI(newuri, tokenId);
    }

    function createResource(string memory uri) public onlyOwner returns (uint256) {
        uint256 newItemId = currentTokenID++;
        // _mint(msg.sender, newItemId, initialSupply, "");
        setURI(newItemId, uri);
        return newItemId;
    }

    // include ERC20 cost
    function setCreationRequirements(uint256 newItemId, uint256[] memory requiredItemIds, uint256[] memory requiredAmounts, uint256 erc20Cost) public onlyOwner {
        require(requiredItemIds.length == requiredAmounts.length, "Mismatch between IDs and amounts");
        EnumerableMap.UintToUintMap storage requirements = creationRequirements[newItemId];
        for (uint256 i = 0; i < requiredItemIds.length; i++) {
            requirements.set(requiredItemIds[i], requiredAmounts[i]);
        }
        creationCosts[newItemId] = erc20Cost; // Set ERC20 cost
    }

    // Require burning of resources and spending ERC20 tokens
    function createNewResourceWithBurnAndPay(uint256 newItemId, uint256 amount) public {
        uint256 erc20Cost = creationCosts[newItemId] * amount;
        // Transfer ERC20 tokens to the contract or another address
        require(chirperCurrency.transferFrom(msg.sender, address(this), erc20Cost), "ERC20 transfer failed");

        // Burn the required items
        for (uint256 i = 0; i < creationRequirements[newItemId].length(); i++) {
            (uint256 requiredItemId, uint256 requiredAmount) = creationRequirements[newItemId].at(i);
            _burn(msg.sender, requiredItemId, requiredAmount * amount); // Multiply requiredAmount by amount for multiple new resources
        }

        // Mint the new resource
        _mint(msg.sender, newItemId, amount, "");
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }
}