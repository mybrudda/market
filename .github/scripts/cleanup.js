const { supabaseAdmin } = require('./supabaseAdmin')

async function cleanupPosts() {
  try {
    console.log('Starting cleanup of expired posts...')
    
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_posts')
    
    if (error) {
      console.error('Error cleaning up expired posts:', error)
      process.exit(1)
    }
    
    console.log('Successfully cleaned up expired posts:', data)
    process.exit(0)
  } catch (error) {
    console.error('Error invoking function:', error)
    process.exit(1)
  }
}

cleanupPosts() 