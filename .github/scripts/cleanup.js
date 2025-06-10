const { supabase } = require('../../supabaseClient')

// Override the client's API key with the service role key for admin operations
supabase.supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

async function cleanupPosts() {
  try {
    const { data, error } = await supabase.functions.invoke('cleanup_expired_posts')
    
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