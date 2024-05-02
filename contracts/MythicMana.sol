// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MythiqMana is ERC20, Ownable {
    constructor(
        address initialOwner
    ) ERC20("MythiqMana", "MANA") Ownable(initialOwner) {}

    function mint(address to, uint256 amount) public onlyOwner {
        // Additional access control recommended
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
}
