// Merkle membership proof for anonymity set (Paper 1: U2SSO)
// Depth 10 = 1024 leaves
use dep::std;

/// Verify that a leaf is a member of a Merkle tree with the given root.
/// Uses Pedersen hashing (native to BN254 in Noir).
pub fn verify_membership(
    leaf: Field,
    path: [Field; 10],
    indices: [Field; 10],
    root: Field,
) {
    let mut current = leaf;
    for i in 0..10 {
        let path_element = path[i];
        // indices[i] == 0 means leaf is on the left, 1 means right
        let (left, right) = if indices[i] == 0 {
            (current, path_element)
        } else {
            (path_element, current)
        };
        current = std::hash::pedersen_hash([left, right]);
    }
    assert(current == root, "Not in anonymity set");
}
