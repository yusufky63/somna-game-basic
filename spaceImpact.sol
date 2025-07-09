// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SpaceImpact {
    using ECDSA for bytes32;

    struct ScoreEntry {
        string nickname;
        uint256 score;
        address player;
        uint256 timestamp;
    }

    mapping(address => ScoreEntry) public playerScores;
    ScoreEntry[] public leaderboard;
    address public owner;
    address public signer; 
    uint256 public minScoreThreshold = 10; 
    uint256 constant MAX_LEADERBOARD_SIZE = 10; 
    
    mapping(address => mapping(uint256 => bool)) private usedSignatures;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlySigner() {
        require(msg.sender == signer, "Only signer");
        _;
    }

    modifier onlyOwnerOrSigner() {
        require(msg.sender == owner || msg.sender == signer, "Only owner or signer");
        _;
    }

    function isValidNickname(string memory nickname) internal pure returns (bool) {
        bytes memory nick = bytes(nickname);
        if (nick.length == 0 || nick.length > 32) return false;
        for (uint i = 0; i < nick.length; i++) {
            if (nick[i] < 0x20 || nick[i] > 0x7E) return false; 
        }
        return true;
    }

    function recordScore(address player, string memory nickname, uint256 score) external onlyOwnerOrSigner {
        require(isValidNickname(nickname), "Invalid nickname");
        require(score >= minScoreThreshold, "Score below threshold");
        require(player != address(0), "Invalid player address");

        _saveScore(player, nickname, score);
    }
    
    // Ethereum signed message hash implementation
    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }
    
    // Extract signer from signature
    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }
    
    // Split signature into components
    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        
        // Version of signature should be 27 or 28, but some wallets use 0 or 1
        if (v < 27) {
            v += 27;
        }
        
        return (r, s, v);
    }
    
    function submitScoreWithSignature(
        string memory nickname,
        uint256 score,
        uint256 nonce,
        bytes memory signature
    ) external {
        require(isValidNickname(nickname), "Invalid nickname");
        require(score >= minScoreThreshold, "Score below threshold");
        require(!usedSignatures[msg.sender][nonce], "Signature already used");
        
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, score, nickname, nonce));
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address recoveredSigner = recoverSigner(ethSignedMessageHash, signature);
        
        require(recoveredSigner == signer, "Invalid signature");
        
        usedSignatures[msg.sender][nonce] = true;
        
        // Skoru kaydet
        _saveScore(msg.sender, nickname, score);
    }
    
    function _saveScore(address player, string memory nickname, uint256 score) internal {
        playerScores[player] = ScoreEntry(nickname, score, player, block.timestamp);

        bool exists = false;
        for (uint i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == player) {
                leaderboard[i].nickname = nickname;
                leaderboard[i].score = score;
                leaderboard[i].timestamp = block.timestamp;
                exists = true;
                break;
            }
        }

        if (!exists) {
            leaderboard.push(ScoreEntry(nickname, score, player, block.timestamp));
        }

        sortLeaderboard();
    }

    function sortLeaderboard() internal {
        if (leaderboard.length <= 1) return;

        for (uint i = 1; i < leaderboard.length; i++) {
            ScoreEntry memory key = leaderboard[i];
            int j = int(i) - 1;

            while (j >= 0 &&
                   (leaderboard[uint(j)].score < key.score ||
                    (leaderboard[uint(j)].score == key.score && leaderboard[uint(j)].timestamp > key.timestamp))) {
                leaderboard[uint(j + 1)] = leaderboard[uint(j)];
                j--;
            }
            leaderboard[uint(j + 1)] = key;
        }

        while (leaderboard.length > MAX_LEADERBOARD_SIZE) {
            leaderboard.pop();
        }
    }

    function getLeaderboard() external view returns (ScoreEntry[] memory) {
        return leaderboard;
    }

    function updateMinScoreThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Invalid threshold");
        minScoreThreshold = newThreshold;
    }

    function setSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer address");
        signer = newSigner;
    }
}