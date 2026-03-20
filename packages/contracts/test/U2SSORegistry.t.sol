// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/U2SSORegistry.sol";

contract U2SSORegistryTest is Test {
    U2SSORegistry registry;

    function setUp() public {
        registry = new U2SSORegistry(0); // no fee for testing
    }

    function test_RegisterIdentity() public {
        bytes32 commitment = keccak256("test_identity");
        bytes32 root = keccak256("test_root");
        registry.registerMasterIdentity(commitment, root);
        assertEq(registry.getAnonymitySetRoot(0), root);
        assertTrue(registry.isRegistered(commitment));
        assertEq(registry.setMemberCount(0), 1);
    }

    function test_PreventDuplicateRegistration() public {
        bytes32 commitment = keccak256("test_identity");
        bytes32 root = keccak256("test_root");
        registry.registerMasterIdentity(commitment, root);
        vm.expectRevert("Already registered");
        registry.registerMasterIdentity(commitment, root);
    }

    function test_SetRotation() public {
        // Fill set to capacity (1024), then register one more
        for (uint256 i = 0; i < 1024; i++) {
            bytes32 commitment = keccak256(abi.encodePacked("identity_", i));
            bytes32 root = keccak256(abi.encodePacked("root_", i));
            registry.registerMasterIdentity(commitment, root);
        }
        assertEq(registry.currentSetIndex(), 0);
        // Next registration should go to set 1
        bytes32 nextCommitment = keccak256("overflow_identity");
        bytes32 nextRoot = keccak256("overflow_root");
        registry.registerMasterIdentity(nextCommitment, nextRoot);
        assertEq(registry.currentSetIndex(), 1);
        assertEq(registry.setMemberCount(1), 1);
    }

    function test_RegistrationFee() public {
        U2SSORegistry feeRegistry = new U2SSORegistry(0.01 ether);
        bytes32 commitment = keccak256("test_identity");
        bytes32 root = keccak256("test_root");
        vm.expectRevert("Insufficient fee");
        feeRegistry.registerMasterIdentity(commitment, root);
        // Should succeed with fee
        feeRegistry.registerMasterIdentity{value: 0.01 ether}(commitment, root);
        assertTrue(feeRegistry.isRegistered(commitment));
    }
}
