# GitHub Actions Workflows

This directory contains GitHub Actions workflows and their supporting scripts for automated tasks in the Market application.

## Cleanup Expired Posts Workflow

### Purpose
Automatically removes expired and deleted posts from the database and their associated images from Cloudinary storage.

### Components

#### 1. Workflow File (`workflows/cleanup-posts.yml`)
- Runs daily at midnight UTC
- Can be triggered manually through GitHub Actions UI
- Uses Node.js to execute the cleanup script
- Requires Supabase credentials stored in GitHub Secrets

#### 2. Cleanup Script (`scripts/cleanup.js`)
- Invokes the Supabase function `cleanup_expired_posts`
- Uses admin privileges via service role key
- Logs success/failure of the cleanup operation

#### 3. Supabase Admin Client (`scripts/supabaseAdmin.js`)
- Creates a Supabase client with admin privileges
- Used specifically for administrative tasks

### Required Secrets
Make sure these secrets are set in your GitHub repository:
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### Manual Trigger
To manually trigger the cleanup:
1. Go to the "Actions" tab in GitHub
2. Select "Cleanup Expired Posts" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

### Logs
- Execution logs can be viewed in the Actions tab
- Each run will show:
  - Success/failure status
  - Number of posts cleaned up
  - Any errors that occurred

### Supabase Function
The workflow triggers a Supabase function that:
1. Identifies expired/removed posts
2. Deletes associated images from Cloudinary
3. Removes the posts from the database
4. Logs the cleanup operation in the database 