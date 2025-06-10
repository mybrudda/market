const fetch = require('node-fetch');
const { supabaseAdmin } = require('./supabaseAdmin');

const CLOUDINARY_CLOUD_NAME = 'dtac4dhtj';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

async function deleteCloudinaryImage(imageUrl) {
  try {
    const publicId = imageUrl.match(/\/upload\/(?:v\d+\/)?([^/.]+)/)?.[1];
    if (!publicId) {
      console.error(`Could not extract public_id from URL: ${imageUrl}`);
      return false;
    }

    const basicAuth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({ public_id: publicId, invalidate: true }),
      }
    );

    const result = await response.json();
    if (result.result !== 'ok') {
      console.error(`Failed to delete image: ${imageUrl}`, result);
    }
    return result.result === 'ok';
  } catch (error) {
    console.error(`Error deleting image: ${imageUrl}`, error);
    return false;
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

    let imagesDeleted = 0;
    let imagesFailed = 0;

    for (const post of posts) {
      console.log(`Processing post ID: ${post.id} - Title: ${post.title}`);

      if (post.images && Array.isArray(post.images)) {
        for (const imageUrl of post.images) {
          const success = await deleteCloudinaryImage(imageUrl);
          if (success) imagesDeleted++;
          else imagesFailed++;
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

    // Log cleanup
    await supabaseAdmin.from('cleanup_logs').insert({
      operation: 'posts_cleanup',
      rows_affected: deletedPosts.length,
      details: { images_deleted: imagesDeleted, images_failed: imagesFailed, timestamp: now },
      executed_at: now,
    });

    console.log(`Cleanup completed. Posts deleted: ${deletedPosts.length}, Images deleted: ${imagesDeleted}, Images failed: ${imagesFailed}`);

    return {
      success: true,
      postsDeleted: deletedPosts.length,
      imagesDeleted,
      imagesFailed,
    };
  } catch (error) {
    console.error('Error in cleanup process:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { cleanupExpiredPosts };
