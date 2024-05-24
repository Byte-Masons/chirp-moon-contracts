// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChirperResources is ERC1155, Ownable {
    struct Creation {
        uint128 cost; // ERC20 token cost
        uint64[] itemIds; // IDs of required items
        uint64[] amounts; // Amounts of each item required
    }

    uint256 public currentTokenID = 0;
    mapping(uint256 => string) private tokenURIs;
    mapping(uint256 => Creation) public creationRequirements;
    IERC20 public chirperCurrency;

    event ResourceDeleted(uint256 indexed tokenId);
    event ResourceCreated(uint256 indexed tokenId);
    event CreationRequirementsSet(
        uint256 indexed newItemId,
        uint64[] itemIds,
        uint64[] amounts,
        uint128 erc20Cost
    );
    event TokensBatchBurned(
        address indexed operator,
        uint256[] tokenIds,
        uint256[] amounts
    );

    constructor(
        IERC20 _chirperCurrency,
        address initialOwner
    ) ERC1155("") Ownable(initialOwner) {
        chirperCurrency = _chirperCurrency;
    }

    function getCreationRequirements(
        uint256 id
    ) external view returns (Creation memory) {
        return creationRequirements[id];
    }

    function setURI(uint256 tokenId, string memory newuri) public onlyOwner {
        require(bytes(tokenURIs[tokenId]).length == 0, "URI already set");
        tokenURIs[tokenId] = newuri;
        emit URI(newuri, tokenId);
    }

    function createResource(
        string memory uri
    ) public onlyOwner returns (uint256) {
        uint256 newItemId = currentTokenID++;
        setURI(newItemId, uri);
        emit ResourceCreated(newItemId); // Emit the event
        return newItemId;
    }

    function setCreationRequirements(
        uint256 newItemId,
        uint64[] memory itemIds,
        uint64[] memory amounts,
        uint128 erc20Cost
    ) public onlyOwner {
        require(
            itemIds.length == amounts.length,
            "Mismatch between IDs and amounts"
        );
        creationRequirements[newItemId] = Creation({
            cost: erc20Cost,
            itemIds: itemIds,
            amounts: amounts
        });
        emit CreationRequirementsSet(newItemId, itemIds, amounts, erc20Cost);
    }

    function createNewResourceWithBurnAndPay(
        uint256 newItemId,
        uint256 amount
    ) public {
        Creation storage creation = creationRequirements[newItemId];
        uint256 erc20Cost = creation.cost * amount;
        require(
            chirperCurrency.transferFrom(msg.sender, address(this), erc20Cost),
            "ERC20 transfer failed"
        );

        for (uint256 i = 0; i < creation.itemIds.length; i++) {
            _burn(
                msg.sender,
                creation.itemIds[i],
                creation.amounts[i] * amount
            );
        }

        _mint(msg.sender, newItemId, amount, "");
    }

    function deleteResource(uint256 tokenId) public onlyOwner {
        delete creationRequirements[tokenId];
        delete tokenURIs[tokenId];
        emit ResourceDeleted(tokenId); // Emit the event
    }

    function batchBurnNFTs(
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) public onlyOwner {
        require(
            tokenIds.length == amounts.length,
            "Mismatch between token IDs and amounts"
        );
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _burn(msg.sender, tokenIds[i], amounts[i]);
        }
        emit TokensBatchBurned(msg.sender, tokenIds, amounts);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }
}
