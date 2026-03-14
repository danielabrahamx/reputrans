// U2SSO nullifier generation (Paper 1: U2SSO Section 6)
// Deterministic per identity per platform type - prevents double-use
use dep::std;

/// Compute a nullifier from master_secret and platform_type.
/// The nullifier is deterministic: same identity + same platform type = same nullifier.
/// This prevents a user from submitting reputation proofs multiple times.
pub fn compute_nullifier(
    master_secret: Field,
    platform_type: Field,
) -> Field {
    std::hash::pedersen_hash([master_secret, platform_type])
}
