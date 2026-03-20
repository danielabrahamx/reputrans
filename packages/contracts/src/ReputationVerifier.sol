// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IUltraVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

interface IU2SSORegistry {
    function currentSetIndex() external view returns (uint256);
    function getAnonymitySetRoot(uint256 setIndex) external view returns (bytes32);
}

contract ReputationVerifier {
    IUltraVerifier public immutable verifier;
    IU2SSORegistry public immutable registry;
    mapping(bytes32 => bool) public usedNullifiers;

    event ReputationVerified(address indexed requester, uint8 platformType, uint8 minRating, uint256 minTrips, bytes32 nullifier);

    constructor(address _verifier, address _registry) {
        verifier = IUltraVerifier(_verifier);
        registry = IU2SSORegistry(_registry);
    }

    function verifyReputation(bytes calldata proof, bytes32[] calldata publicInputs) external returns (bool) {
        require(publicInputs.length == 5, "Invalid public inputs");
        bytes32 nullifier = publicInputs[0];
        bytes32 anonymitySetRoot = publicInputs[1];
        require(!usedNullifiers[nullifier], "Nullifier already used");
        bool rootExists = false;
        for (uint256 i = 0; i <= registry.currentSetIndex(); i++) {
            if (registry.getAnonymitySetRoot(i) == anonymitySetRoot) {
                rootExists = true;
                break;
            }
        }
        require(rootExists, "Unknown anonymity set");
        require(verifier.verify(proof, publicInputs), "Invalid proof");
        usedNullifiers[nullifier] = true;
        emit ReputationVerified(msg.sender, uint8(uint256(publicInputs[2])), uint8(uint256(publicInputs[3])), uint256(publicInputs[4]), nullifier);
        return true;
    }
}
