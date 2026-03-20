// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/U2SSORegistry.sol";
import "../src/ReputationVerifier.sol";
import "../src/MockVerifier.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy registry with 0 fee (testnet)
        U2SSORegistry registry = new U2SSORegistry(0);

        // Deploy mock verifier (proof pre-verified off-chain via noir_js)
        // In production: deploy UltraVerifier from plonk_vk.sol
        MockVerifier mockVerifier = new MockVerifier();

        // Deploy ReputationVerifier with mock verifier + registry
        ReputationVerifier repVerifier = new ReputationVerifier(
            address(mockVerifier),
            address(registry)
        );

        vm.stopBroadcast();

        console.log("U2SSORegistry:", address(registry));
        console.log("MockVerifier:", address(mockVerifier));
        console.log("ReputationVerifier:", address(repVerifier));
    }
}
