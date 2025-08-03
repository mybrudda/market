const { supabaseAdmin } = require('./supabaseAdmin');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const CONFIG = {
  BATCH_SIZE: 10,            // Number of posts per batch
  MAX_CLOUDINARY_DELETE: 100 // Max images Cloudinary allows in bulk delete
};

interface CleanupResult {
  success: boolean;
  postsDeleted: number;
  imagesDeleted: number;
  imagesFailed: number;
}

interface FailedDeletion {
  postId: string;
  imagePublicId: string;
  error: string;
}

interface CleanupLog {
  operation: string;
  rows_affected: number;
  details: {
    images_deleted?: number;
    images_failed?: number;
    failed_deletions?: FailedDeletion[];
    error?: string;
    timestamp: string;
  };
  executed_at: string;
}

interface Post {
  id: string;
  image_ids?: string[];
}

// Helper: Extract Cloudinary public_id from full image URL
function extractPublicId(url: string): string | null {
  try {
    const parts = url.split('/');
    const lastSegment = parts.pop();
    if (!lastSegment) return null;
    return lastSegment.split('.')[0]; // Removes file extension
  } catch {
    return null;
  }
}

// Bulk delete images via Cloudinary
async function deleteImages(publicIds: string[]): Promise<{ deleted: string[], failed: string[] }> {
  try {
    // Cloudinary allows up to 100 per call on free tier, BATCH_SIZE ensures we don't exceed
    const result = await cloudinary.api.delete_resources(publicIds);

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const [id, status] of Object.entries(result.deleted || {})) {
      if (status === 'deleted') deleted.push(id);
      else failed.push(id);
    }

    return { deleted, failed };
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    // On failure, assume all failed (to be safe)
    return { deleted: [], failed: publicIds };
  }
}

// Fetch expired posts in batches with offset pagination
async function getExpiredPosts(offset: number): Promise<Post[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, image_ids')
    .lt('expires_at', now)
    .in('status', ['expired', 'removed'])
    .range(offset, offset + CONFIG.BATCH_SIZE - 1);

  if (error) throw error;
  return (data || []) as Post[];
}

// Main cleanup function
async function cleanupExpiredPosts(): Promise<CleanupResult> {
  const startTime = Date.now();
  let offset = 0;

  let totalPostsDeleted = 0;
  let totalImagesDeleted = 0;
  let totalImagesFailed = 0;

  const failedDeletions: FailedDeletion[] = [];

  try {
    while (true) {
      const posts = await getExpiredPosts(offset);
      if (!posts.length) break;

      console.log(`Processing batch of ${posts.length} posts`);

      // Map posts to their Cloudinary public_ids
      const postIdToPublicIds: { [postId: string]: string[] } = {};
      const allPublicIds: string[] = [];

      for (const post of posts) {
        const publicIds = (post.image_ids || [])
          .map(extractPublicId)
          .filter((id): id is string => !!id)
          .slice(0, 10); // max 10 images per post

        postIdToPublicIds[post.id] = publicIds;
        allPublicIds.push(...publicIds);
        
        // Log if post has invalid image URLs
        const totalImages = (post.image_ids || []).length;
        const validImages = publicIds.length;
        if (totalImages > validImages) {
          console.log(`Post ${post.id}: ${totalImages - validImages} invalid image URLs found`);
        }
      }

      // Delete images in bulk (<= 100 images)
      let deletedIds: string[] = [];
      let failedIds: string[] = [];
      if (allPublicIds.length > 0) {
        const { deleted, failed } = await deleteImages(allPublicIds);
        deletedIds = deleted;
        failedIds = failed;

        totalImagesDeleted += deleted.length;
        totalImagesFailed += failed.length;

        // Track failed deletions by post
        for (const failedId of failed) {
          for (const [postId, ids] of Object.entries(postIdToPublicIds)) {
            if (ids.includes(failedId)) {
              failedDeletions.push({
                postId,
                imagePublicId: failedId,
                error: 'Failed to delete image from Cloudinary'
              });
              break;
            }
          }
        }
      }

      // Filter posts where **all** images deleted successfully
      const postsToDelete = posts.filter((post: Post) => {
        const publicIds = postIdToPublicIds[post.id] || [];
        
        // If post has no images, it's safe to delete
        if (publicIds.length === 0) {
          return true;
        }
        
        // If post has images, only delete if ALL images were successfully deleted
        return publicIds.every((id: string) => deletedIds.includes(id));
      });

      if (postsToDelete.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from('posts')
          .delete()
          .in('id', postsToDelete.map((p: Post) => p.id));

        if (deleteError) {
          throw deleteError;
        }
        totalPostsDeleted += postsToDelete.length;
        console.log(`Deleted ${postsToDelete.length} posts (${posts.length - postsToDelete.length} posts skipped due to image deletion failures)`);
      } else {
        console.log(`Skipped all ${posts.length} posts due to image deletion failures`);
      }

      offset += CONFIG.BATCH_SIZE;
    }

    // Log cleanup summary
    const cleanupLog: CleanupLog = {
      operation: 'posts_cleanup',
      rows_affected: totalPostsDeleted,
      details: {
        images_deleted: totalImagesDeleted,
        images_failed: totalImagesFailed,
        failed_deletions: failedDeletions,
        timestamp: new Date().toISOString()
      },
      executed_at: new Date().toISOString(),
    };

    await supabaseAdmin.from('cleanup_logs').insert(cleanupLog);

    console.log(`Cleanup finished. Posts deleted: ${totalPostsDeleted}, Images deleted: ${totalImagesDeleted}, Images failed: ${totalImagesFailed}`);

    // Log warnings for failed images but don't fail the entire script
    if (totalImagesFailed > 0) {
      console.warn(`Warning: ${totalImagesFailed} images failed to delete. Check cleanup_logs for details.`);
      console.warn(`Posts with failed images were skipped to prevent orphaned images in Cloudinary.`);
    }

    return {
      success: true,
      postsDeleted: totalPostsDeleted,
      imagesDeleted: totalImagesDeleted,
      imagesFailed: totalImagesFailed
    };
  } catch (error) {
    console.error('Cleanup error:', error);

    // Log error to cleanup_logs table before throwing
    const errorLog: CleanupLog = {
      operation: 'posts_cleanup',
      rows_affected: 0,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      executed_at: new Date().toISOString()
    };

    try {
      await supabaseAdmin.from('cleanup_logs').insert(errorLog);
    } catch (logErr) {
      console.error('Failed to log cleanup error:', logErr);
    }

    throw error; // Fail the GitHub Action or calling process
  }
}

// If run directly from CLI
if (require.main === module) {
  cleanupExpiredPosts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredPosts };


