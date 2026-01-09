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
Ask for license upload. 
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


**What has been built**
1. User types and storage (types/user.ts, lib/mockUsers.ts)
User interface with campus assignment, roles (rider/driver/both), and verification
In-memory user storage (similar to mockCarpools.ts)
Password hashing, session management, and email verification tokens
2. API routes (app/api/auth/)
/api/auth/register - Register new users with campus email validation
/api/auth/verify-email - Verify email with token
/api/auth/signin - Sign in with email/password
/api/auth/session - Get current session info
3. UI pages
/register - Registration form with:
Campus email validation (.edu, .ac.uk, .edu.au)
Password creation (min 8 characters)
Optional driver checkbox
Driver fields: legal name (required), license upload (optional)
/verify-email - Email verification page
/signin - Sign in page
4. Features implemented
✅ Campus email domain validation
✅ Email verification flow
✅ Automatic campus assignment based on email domain
✅ Pseudonym generation for users
✅ Optional driver registration with legal name
✅ License upload support (base64 for MVP)
✅ Session management with cookies
✅ Password hashing (SHA-256 for MVP; use bcrypt in production)
5. Navigation
Added Sign In and Register links to the home page
Updated app metadata
Important notes for MVP
Email sending: The registration API logs the verification token to the console in development. In production, send the verification email via a service like SendGrid or Resend.
Password hashing: Currently using SHA-256. For production, use bcrypt (install bcrypt and update lib/mockUsers.ts).
File storage: License uploads are stored as base64. For production, use cloud storage (AWS S3, Cloudinary, etc.).
Session storage: Sessions are in-memory. For production, use a database or Redis.
Testing the flow
Visit /register and create an account with a .edu email
Check the console for the verification token (in development)
Visit /verify-email?token=<token> to verify
Sign in at /signin