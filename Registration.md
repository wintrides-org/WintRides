### Big picture
App is a closed ecosystem by campus
Registration Flow: They sign up with a campus email, verify it, and choose if they want to also be a driver.

### Registration Platform & Campus Authentication
**Goal:** Only verified students (or staff) from a single campus can register. Everyone can be a rider, but they can also opt in as a driver if they choose.
**How to do this:**
- Email Domain Verification: 
Require users to sign up with their university email (like @myuniversity.edu). That ensures only people from that institution can register.
- One-Time Authentication Step: 
After they sign up, send a verification link to their university email. Once they click it, they’re confirmed as part of that campus network.

- Role Selection During Registration:
By default, everyone is a rider. Add a simple checkbox like “I’m also available to drive” for those who want to be drivers. They can update this preference later if they want.
Note: A user might be a rider one day and a driver another day. They toggle that role in their profile settings after they register.

*dfgf*

**On the backend:** 
*A1. Campus Lock*
The first time a user registers, they verify with an institution email.
The system maps that email domain to a campus_id.
The user is permanently assigned to that campus_id (unless admins support transfers later).
All messages, threads, and urgent posts are scoped to campus_id.
A user never sees other campuses, other campus names, or cross-campus content.

*A2. Roles*
Every user is a “member” of the campus by default.
Rider capability: always on.
Driver capability: optional toggle (“I can drive”), with driver-specific profile fields.
A user can be both at once, and can switch availability day-to-day.

*A3. Identity in chat (privacy + trust balance)*
Hybrid: pseudonym publicly, real identity revealed only after a driver accepts / group confirms.
From users perspective: 
Sign Up (once)
.edu email (campus-gated)
email verification
create password
system assigns pseudonym + internal ID
Option to sign up as a driver: 
Ask for license upload/manual entry of deatils 
Verify name matches provided legal name 
(for MVP+, verify image on id with pic)
Sign In (repeated)
email + password
session persistence
Inside the App
users see:
pseudonym
reliability indicators (MVP+): 
rides completed 
no show count 
ratings and badges


real names:
revealed only inside a confirmed ride
not searchable
not stored in public history
Other Notes

How to determine a ride has been completed:  
At the scheduled pickup time, the ride card shows a big button: I’m here (Check in)
When someone taps it, the app generates a 4-digit code (or short word pair). They tell the other person the code in person / text.
Then the other person taps: Enter code
If the code matches, the system marks: Meet up confirmed


**: License verification logic**
*license fields*
{
  legalName: string,
  licenseNumber: string,
  licenseExpirationDate: Date,
  issuingState: USStateCode
}

*Issuing state validation*
- issuingState must be a valid U.S. state or DC
- Value must come from a controlled enum (no free-text)

*License expiration check*
- Expiration date must be at least 7 days in the future 

*License number format check (state-aware)*
- Validate against rules for the issuing state:
    - Minimum and maximum length
    - Allowed character set (numeric vs alphanumeric)
- License number sanity
    - No whitespace
    - No special characters outside allowed pattern
    - Not a repeated or obviously fake sequence (e.g., 0000000, AAAAAAA)

*Legal name sanity check*
- Minimum length (e.g., ≥ 2 characters)
- Contains only reasonable name characters (letters, spaces, hyphens, apostrophes)
- Not purely numeric or symbol-only

Alabama (AL): 7–8, N
Alaska (AK): 7, N
Arizona (AZ): 8–9, A/N
Arkansas (AR): 8–9, N
California (CA): 7–8, A/N
Colorado (CO): 9, N
Connecticut (CT): 9, N
Delaware (DE): 7, N
Florida (FL): 12–13, A/N
Georgia (GA): 7–9, N
Hawaii (HI): 9, A/N
Idaho (ID): 9, A/N
Illinois (IL): 12, A/N
Indiana (IN): 9–10, N
Iowa (IA): 9, N
Kansas (KS): 9, A/N
Kentucky (KY): 9, N
Louisiana (LA): 9, N
Maine (ME): 7, N
Maryland (MD): 13, A/N
Massachusetts (MA): 9, N
Michigan (MI): 10–13, A/N
Minnesota (MN): 13, A/N
Mississippi (MS): 9, N
Missouri (MO): 9, N
Montana (MT): 9, A/N
Nebraska (NE): 7–8, A/N
Nevada (NV): 9–10, A/N
New Hampshire (NH): 2–7, N
New Jersey (NJ): 9, A/N
New Mexico (NM): 8–9, N
New York (NY): 8–9, A/N
North Carolina (NC): 12, N
North Dakota (ND): 9, A/N
Ohio (OH): 8–9, A/N
Oklahoma (OK): 9, A/N
Oregon (OR): 1–9, N
Pennsylvania (PA): 8, N
Rhode Island (RI): 7, N
South Carolina (SC): 5–11, N
South Dakota (SD): 9, N
Tennessee (TN): 7–9, N
Texas (TX): 7–8, N
Utah (UT): 4–10, N
Vermont (VT): 8, N
Virginia (VA): 9, A/N
Washington (WA): 12, A/N
West Virginia (WV): 7, N
Wisconsin (WI): 14, A/N
Wyoming (WY): 9–10, N
District of Columbia (DC): 7, N