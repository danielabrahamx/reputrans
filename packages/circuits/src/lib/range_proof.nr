// Range proofs for rating and trip count
// Privacy-preserving: proves value >= threshold without revealing exact value

/// Verify that actual_rating >= min_rating and rating <= max (50 = 5.0 stars)
pub fn verify_rating_range(
    rating: u8,
    min_rating_threshold: u8,
) {
    assert(rating >= min_rating_threshold, "Rating below threshold");
    assert(rating <= 50, "Rating out of range"); // Max 5.0 stars
}

/// Verify that actual trip count >= minimum threshold
pub fn verify_trip_range(
    trip_count: u32,
    min_trips_threshold: u32,
) {
    assert(trip_count >= min_trips_threshold, "Trips below threshold");
}

/// Verify platform type matches (hides specific platform)
/// Platform IDs: Uber=0x00, Lyft=0x01 -> type Rideshare (0)
///               Airbnb=0x10, VRBO=0x11 -> type Homeshare (1)
/// Top 4 bits encode type
pub fn verify_platform_type(
    platform_id: u8,
    expected_platform_type: u8,
) {
    let credential_platform_type = platform_id >> 4;
    assert(credential_platform_type == expected_platform_type, "Platform type mismatch");
}
