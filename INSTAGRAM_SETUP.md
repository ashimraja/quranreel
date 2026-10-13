# Instagram posting setup (one time)

1. Instagram app: Settings > Account type and tools > Switch to professional account (Creator or Business).
2. Facebook: create a Page (any name). Page > Settings > Linked accounts > connect your Instagram account.
3. developers.facebook.com > My Apps > Create App > type "Business" (or Other > Business). You stay in
   Development mode: no App Review is needed while you post to your own account (you are the app admin).
4. Add the "Facebook Login for Business" / Graph API product. Open Tools > Graph API Explorer, pick your app,
   and generate a User token with permissions:
   instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement, business_management.
   Approve the Page and Instagram account in the dialog.
5. Make it long-lived (about 60 days): in the Access Token Debugger click "Extend Access Token", copy the new token.
6. Find your Instagram user id: in Graph API Explorer run
   GET me/accounts?fields=name,instagram_business_account
   and copy instagram_business_account.id.
7. In the app, Instagram section: paste user id + token, Save. Then use "Post" on the first reel.

Notes: Instagram's API has no scheduling, so posting happens when you tap Post. Limit: 100 API posts per 24 hours.
Tokens expire (about 60 days): repeat step 5 when posting starts failing with an auth error.
