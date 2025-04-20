// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SnakeLadderNFT is ERC721 {
    struct Game {
        uint8 position;
        bool active;
    }
    
    mapping(address => Game) public games;
    mapping(uint8 => uint8) private _jumps;
    uint256 private _tokenId;

    constructor() ERC721("SnakeLadderChampion", "SLC") {
        // Initialize snakes (key > value)
        _jumps[16] = 6;   _jumps[47] = 26;  _jumps[49] = 11;
        _jumps[56] = 53;  _jumps[62] = 19;  _jumps[64] = 60;
        _jumps[87] = 24;  _jumps[93] = 73;  _jumps[95] = 75;
        _jumps[98] = 78;
        
        // Initialize ladders (key < value)
        _jumps[1] = 38;   _jumps[4] = 14;   _jumps[9] = 31;
        _jumps[21] = 42;  _jumps[28] = 84;  _jumps[36] = 44;
        _jumps[51] = 67;  _jumps[71] = 91;  _jumps[80] = 100;
    }

    function startGame() external {
        require(!games[msg.sender].active, "Active game exists");
        games[msg.sender] = Game(0, true);
    }

    function rollDice() external {
        Game storage game = games[msg.sender];
        require(game.active, "No active game");
        
        uint8 dice = _randomDice();
        uint8 newPos = game.position + dice;
        
        if(newPos <= 100) {
            if(_jumps[newPos] != 0) {
                newPos = _jumps[newPos];
            }
            game.position = newPos;
            
            if(newPos == 100) {
                _mint(msg.sender, _tokenId++);
                game.active = false;
            }
        }
    }

    function _randomDice() private view returns (uint8) {
        return uint8(uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            msg.sender,
            block.prevrandao
        ))) % 6) + 1;
    }
}