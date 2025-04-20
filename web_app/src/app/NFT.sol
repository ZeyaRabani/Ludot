// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract WinnerNFT is ERC721 {
    uint256 private _tokenId;
    address private _winner;

    constructor() ERC721("WNFT", "WNFT") {} // Shorter names

    function declareWinner(address winner) external {
        require(_winner == address(0), "Winner exists");
        _winner = winner;
        _mint(winner, _tokenId++); // Combined increment
    }
}