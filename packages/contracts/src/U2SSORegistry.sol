// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract U2SSORegistry {
    mapping(uint256 => bytes32) public anonymitySetRoots;
    uint256 public currentSetIndex;
    uint256 public constant SET_SIZE = 1024;
    mapping(uint256 => uint256) public setMemberCount;
    uint256 public registrationFee;
    mapping(bytes32 => bool) public isRegistered;

    event MasterIdentityRegistered(uint256 indexed setIndex, uint256 indexed leafIndex, bytes32 identityCommitment);
    event AnonymitySetRootUpdated(uint256 indexed setIndex, bytes32 newRoot);

    constructor(uint256 _registrationFee) {
        registrationFee = _registrationFee;
    }

    function registerMasterIdentity(bytes32 identityCommitment, bytes32 newRoot) external payable {
        require(msg.value >= registrationFee, "Insufficient fee");
        require(!isRegistered[identityCommitment], "Already registered");
        if (setMemberCount[currentSetIndex] >= SET_SIZE) {
            currentSetIndex++;
        }
        uint256 leafIndex = setMemberCount[currentSetIndex];
        setMemberCount[currentSetIndex]++;
        isRegistered[identityCommitment] = true;
        anonymitySetRoots[currentSetIndex] = newRoot;
        emit MasterIdentityRegistered(currentSetIndex, leafIndex, identityCommitment);
        emit AnonymitySetRootUpdated(currentSetIndex, newRoot);
    }

    function getAnonymitySetRoot(uint256 setIndex) external view returns (bytes32) {
        return anonymitySetRoots[setIndex];
    }
}
