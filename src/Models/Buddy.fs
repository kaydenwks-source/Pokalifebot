/// Accountability buddies (Phase 25). A one-time invite code pairs two users;
/// the active pairing is stored as a single mutual link. Names are resolved
/// from the user profile at display time, so only ids live here.
module Models.Buddy

/// A pending invite a user generated to pair with someone.
type BuddyInvite =
    { Code: string
      InviterId: float
      CreatedAt: string } // "yyyy-MM-dd HH:mm"

/// An active pairing. Mutual — either side may be "me".
type BuddyLink =
    { AId: float
      BId: float
      Since: string } // "yyyy-MM-dd"
