# GitHub Actions Workflows

This directory contains GitHub Actions workflows and their supporting scripts for automated tasks in the Market application.

## Cleanup Expired Posts Workflow

### Purpose
Automatically removes expired and deleted posts from the database and their associated images from Cloudinary storage.

### Components

#### 1. Workflow File (`workflows/cleanup-posts.yml`)
- Runs daily at 3 AM UTC
- Can be triggered manually through GitHub Actions UI
- Uses Node.js to execute the cleanup script
- Requires both Supabase and Cloudinary credentials stored in GitHub Secrets

#### 2. Cleanup Script (`scripts/cleanup.js`)
The script handles two main tasks:
1. Deleting Cloudinary Images:
   - Extracts public_id from image URLs
   - Uses Cloudinary SDK to delete images
   - Handles errors and logs deletion status
2. Removing Posts:
   - Deletes expired or removed posts from Supabase
   - Logs all operations for monitoring
   - Fails the action if any deletions are unsuccessful

#### 3. Supabase Admin Client (`scripts/supabaseAdmin.js`)
- Creates a Supabase client with admin privileges
- Used for database operations

### Required Secrets
Make sure these secrets are set in your GitHub repository:
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name (dtac4dhtj)

### Manual Trigger
To manually trigger the cleanup:
1. Go to the "Actions" tab in GitHub
2. Select "Cleanup Expired Posts" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

### Logs and Monitoring
- Execution logs can be viewed in the Actions tab
- Each run will show:
  - Number of posts processed
  - Number of images successfully deleted
  - Any failed deletions with error details
  - Overall operation status

### Error Handling
The workflow will fail if:
- Any image fails to delete from Cloudinary
- Any post fails to delete from the database
- Required credentials are missing or invalid
- The number of deleted posts doesn't match expected count

### Cleanup Process
1. Identifies posts that are either:
   - Expired (past expiry_date)
   - Marked as 'removed' by users
2. For each post:
   - Deletes all associated images from Cloudinary
   - Removes the post record from Supabase
3. Logs the results in the cleanup_logs table
4. Fails the action if any step is unsuccessful

### Debugging
If the workflow fails:
1. Check the Actions tab for detailed error logs
2. Verify all secrets are properly set
3. Check the cleanup_logs table in Supabase for detailed operation logs
4. Ensure Cloudinary and Supabase credentials have proper permissions 