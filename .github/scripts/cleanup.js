const { supabaseAdmin } = require('./supabaseAdmin');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function deleteCloudinaryImage(imageUrl) {
  try {
    // Extract public_id from the URL
    const publicId = imageUrl.split("/").pop().split(".")[0];
    if (!publicId) {
      throw new Error(`Could not extract public_id from URL: ${imageUrl}`);
    }

    console.log(`Attempting to delete image with public_id: ${publicId}`);

    // Use Cloudinary SDK to delete the image
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok') {
      throw new Error(`Failed to delete image ${publicId}: ${JSON.stringify(result)}`);
    }
    
    console.log(`Successfully deleted image: ${publicId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting image: ${imageUrl}`, error);
    throw error; // Re-throw to handle in the main function
  }
}

async function cleanupExpiredPosts() {
  try {
    const now = new Date().toISOString();
    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select('id, images, title')
      .lt('expiry_date', now)
      .in('status', ['removed', 'expired']);

    if (error) throw error;

    console.log(`Found ${posts.length} posts to cleanup`);
    
    if (posts.length === 0) {
      console.log('No posts to cleanup');
      return { success: true, postsDeleted: 0, imagesDeleted: 0, imagesFailed: 0 };
    }

    let imagesDeleted = 0;
    let imagesFailed = 0;
    let failedDeletions = [];

    // First, try to delete all images
    for (const post of posts) {
      console.log(`Processing post ID: ${post.id} - Title: ${post.title}`);

      if (post.images && Array.isArray(post.images)) {
        for (const imageUrl of post.images) {
          try {
            await deleteCloudinaryImage(imageUrl);
            imagesDeleted++;
          } catch (error) {
            imagesFailed++;
            failedDeletions.push({
              postId: post.id,
              imageUrl,
              error: error.message
            });
          }
        }
      }
    }

    // Delete posts after images deleted
    const { data: deletedPosts, error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .lt('expiry_date', now)
      .in('status', ['removed', 'expired'])
      .select();

    if (deleteError) throw deleteError;

    if (!deletedPosts || deletedPosts.length !== posts.length) {
      throw new Error(`Failed to delete all posts. Expected: ${posts.length}, Deleted: ${deletedPosts?.length || 0}`);
    }

    // Log cleanup
    await supabaseAdmin.from('cleanup_logs').insert({
      operation: 'posts_cleanup',
      rows_affected: deletedPosts.length,
      details: { 
        images_deleted: imagesDeleted, 
        images_failed: imagesFailed, 
        failed_deletions: failedDeletions,
        timestamp: now 
      },
      executed_at: now,
    });

    console.log(`Cleanup completed. Posts deleted: ${deletedPosts.length}, Images deleted: ${imagesDeleted}, Images failed: ${imagesFailed}`);

    // If any images failed to delete, throw error to fail the action
    if (imagesFailed > 0) {
      throw new Error(`Failed to delete ${imagesFailed} images. Check cleanup_logs for details. Failed deletions: ${JSON.stringify(failedDeletions, null, 2)}`);
    }

    return {
      success: true,
      postsDeleted: deletedPosts.length,
      imagesDeleted,
      imagesFailed,
    };
  } catch (error) {
    console.error('Error in cleanup process:', error);
    // Log the error to cleanup_logs before throwing
    try {
      await supabaseAdmin.from('cleanup_logs').insert({
        operation: 'posts_cleanup',
        rows_affected: 0,
        details: { 
          error: error.message,
          timestamp: new Date().toISOString()
        },
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log error to cleanup_logs:', logError);
    }
    throw error; // Re-throw to fail the GitHub Action
  }
}

// Execute the cleanup and handle errors
if (require.main === module) {
  cleanupExpiredPosts().catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1); // Exit with error code to fail the GitHub Action
  });
}

module.exports = { cleanupExpiredPosts };
