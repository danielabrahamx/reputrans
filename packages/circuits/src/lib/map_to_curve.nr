// Constraint-efficient map-to-elliptic-curve relation
// From: "Constraint-Friendly Map-to-Elliptic-Curve-Group Relations" (2025/1503)
//
// BN254 curve: y^2 = x^3 + 3 (a=0, b=3)
// Achieves ~30 constraints vs ~7000 for standard hash-to-curve
//
// Method: Increment-and-check with bounded tweak
// The prover finds the smallest tweak t such that (message * BASE + t)
// yields a valid x-coordinate (i.e., x^3 + 3 is a quadratic residue)

// Map a field element to a BN254 curve point using the optimized
// increment-and-check method from Paper 2025/1503.
//
// The prover provides:
//   - tweak: the number of increments needed (witness, typically < 5)
//   - y_hint: the square root of y^2 (witness, computed offline)
//
// The circuit verifies:
//   - tweak is in bounds
//   - y_hint^2 == x^3 + 3 (BN254 curve equation)
pub fn map_to_curve(
    message: Field,
    tweak: Field,
    y_hint: Field,
) -> (Field, Field) {
    // Constraint 1: tweak must be small (prevents malicious input)
    let tweak_u8 = tweak as u8;
    assert(tweak_u8 < 5, "Tweak out of bounds");

    // Constraint 2: compute x = message * 5 + tweak
    // (5 = MAX_TWEAK, ensures non-overlapping message domains per paper S4)
    let x = message * 5 + tweak;

    // Constraint 3-4: compute x^3 + 3 (BN254: a=0, b=3)
    let x_squared = x * x;
    let x_cubed = x_squared * x;
    let y_squared = x_cubed + 3;

    // Constraint 5: verify y_hint is the correct square root
    assert(y_hint * y_hint == y_squared, "Invalid square root hint");

    // BN254 has cofactor 1, so no cofactor clearing needed
    (x, y_hint)
}
