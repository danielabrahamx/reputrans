// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MockVerifier
/// @notice Stand-in for UltraPlonk verifier during hackathon demo.
/// @dev In production, this would be the auto-generated plonk_vk.sol UltraVerifier.
/// Proof verification happens off-chain via noir_js + BarretenbergBackend.
/// This contract accepts pre-verified proofs and records them on-chain.
/// The ReputationVerifier still checks nullifiers and anonymity set roots.
contract MockVerifier {
    /// @notice Always returns true — proof was pre-verified off-chain via noir_js
    function verify(bytes calldata, bytes32[] calldata) external pure returns (bool) {
        return true;
    }
}
