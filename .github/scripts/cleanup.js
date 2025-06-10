const { supabaseAdmin } = require('./supabaseAdmin');

async function deleteCloudinaryImage(imageUrl) {
  try {
    // Extract public_id from the URL
    // Example URL: https://res.cloudinary.com/dtac4dhtj/image/upload/v1234567890/abcdef123456.jpg
    const publicId = imageUrl.match(/\/upload\/(?:v\d+\/)?([^/.]+)/)?.[1];
    if (!publicId) {
      console.error(`Could not extract public_id from URL: ${imageUrl}`);
      return false;
    }

    console.log(`Attempting to delete image with public_id: ${publicId}`);
    
    // Make DELETE request to Cloudinary API using unsigned mode with upload preset
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dtac4dhtj/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          upload_preset: 'Default'
        })
      }
    );

    const result = await response.json();
    console.log(`Cloudinary deletion result:`, result);
    
    return result.result === 'ok';
  } catch (error) {
    console.error(`Error deleting image ${imageUrl}:`, error);
    return false;
  }
}

async function cleanupExpiredPosts() {
  try {
    // Get all expired or removed posts
    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select('id, images, title')
      .lt('expiry_date', new Date().toISOString())
      .in('status', ['removed', 'expired']);

    if (error) throw error;

    console.log(`Found ${posts.length} posts to cleanup`);
    
    let imagesDeleted = 0;
    let imagesFailed = 0;

    // Process each post
    for (const post of posts) {
      console.log(`Processing post ID: ${post.id} - Title: ${post.title}`);
      
      // Delete images from Cloudinary
      if (post.images && Array.isArray(post.images)) {
        for (const imageUrl of post.images) {
          const success = await deleteCloudinaryImage(imageUrl);
          if (success) {
            imagesDeleted++;
          } else {
            imagesFailed++;
          }
        }
      }
    }

    // Delete posts from database
    const { data: deletedPosts, error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .lt('expiry_date', new Date().toISOString())
      .in('status', ['removed', 'expired'])
      .select();

    if (deleteError) throw deleteError;

    // Log cleanup operation
    await supabaseAdmin
      .from('cleanup_logs')
      .insert({
        operation: 'posts_cleanup',
        rows_affected: deletedPosts.length,
        details: {
          images_deleted: imagesDeleted,
          images_failed: imagesFailed,
          timestamp: new Date().toISOString()
        },
        executed_at: new Date().toISOString()
      });

    console.log(`Cleanup completed. Posts deleted: ${deletedPosts.length}, Images deleted: ${imagesDeleted}, Images failed: ${imagesFailed}`);
    
    return {
      success: true,
      postsDeleted: deletedPosts.length,
      imagesDeleted,
      imagesFailed
    };
  } catch (error) {
    console.error('Error in cleanup process:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { cleanupExpiredPosts };