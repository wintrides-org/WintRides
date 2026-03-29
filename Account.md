The “Account” feature is a combination of pages personalized to the user. It will allow the user to view and edit their personal information, preferences, driver and payment information, and see their reviews. It should be accessible as an icon on the top right of the dashboard.  
The following is a description of the pages:

1. Bio/Profile: includes  
   1. Name  (fill in with name used to sign in)
   2. Contact details
      1. Phone number (empty for now)
      2. Email address (fill in with email address used to sign in)
   3. Reset Password (links them to the option to reset their password--> not implemented yet) so should link to in-progress page for now 
   4. Entries to 1 & 2 should be editable   
2. Driver information: includes  
   1. If not a driver, a note saying person is not yet a driver with a link to the “Become a driver” page  
   2. If a driver, then driver details:  
      1. License information (should be editable by scanning a driver’s license)  
      2. Insights  
         * Date of joining WintRides as a driver  
         * Medals won as a driver  
         * Number of rides offered   
         * Total earned  
         * Snapshot of ratings progression  
3. Preferences/Settings → not implement until \>=v2  
   1. Theme (??)  
4. Reviews:  
   1. Ratings  
   2. Reviews   
      1. Each review should have the option, “Report as False”, in which case WintRides admin will determine whether to delete it but driver shouldn’t be allowed to delete their reviews  
      2. Reviews should be collapsible. By default, reviews should be in collapsed view.  
         * Collapsed view: show only the 5 most recent reviews  
         * Uncollapsed view: show all reviews   
      3. Each review should be dated  
      4. There should be a date filter  
5. Payment information  
   1. Payment details  
      1. Card(s) information (should be editable)  
      2. Option to “Add New Payment Option”  
   2. Payment transactions and receipts  
6. Signout button: allow the user to sign out of their account

## After MVP additions (profile-focused)
1. Emergency contact (name, relationship, phone)
2. Campus affiliation details (campus, graduation year)
3. Profile photo/avatar upload
4. Verification badges (email/phone/driver verification)
5. Address or preferred pickup zones
6. Communication preferences (email/SMS/push)
7. Accessibility needs

## Version 2
1. Implement "Reset password" for V2
