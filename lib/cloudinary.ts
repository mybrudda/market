

const CLOUDINARY_CONFIG = {
  cloud_name: "dtac4dhtj",
  upload_preset: "Default",
};

interface CloudinaryResponse {
  secure_url: string;
}

export const uploadToCloudinary = async (base64Image: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', CLOUDINARY_CONFIG.upload_preset);
    formData.append('cloud_name', CLOUDINARY_CONFIG.cloud_name);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloud_name}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
}; 