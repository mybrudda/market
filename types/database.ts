// Database types - data as stored in the database
export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  user_type: 'person' | 'company';
  is_verified: boolean | null;
  profile_image_id?: string | null;
}

export interface BasePost {
  id: string;
  user_id: string;
  user?: User;
  title: string;
  description: string;
  post_type: 'vehicle';
  listing_type: 'rent' | 'sale';
  category: string;
  price: number;
  currency: string;
  location: {
    city: string;
    address?: string;
    country: string;
  };
  images: string[]; // Cloudinary image IDs
  details: VehicleDetails;
  status: 'active' | 'pending' | 'removed' | 'expired';
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleDetails {
  make: string;
  model: string;
  year: string;
  mileage: {
    value: number;
    unit: string;
  };
  fuel_type: string;
  transmission: string;
  condition: string;
  features: string[];
}

export interface VehiclePost extends BasePost {
  post_type: 'vehicle';
  details: VehicleDetails;
  user: User;
}

export type Post = VehiclePost;

export type IconName = 
  | 'car' 
  | 'calendar' 
  | 'speedometer' 
  | 'car-cog' 
  | 'gas-station' 
  | 'car-shift-pattern'
  | 'map-marker'
  | 'phone'
  | 'message'
  | 'bookmark'
  | 'bookmark-outline'
  | 'share'
  | 'flag'
  | 'dots-vertical'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'check'
  | 'alert-circle'
  | 'image-off'
  | 'home'
  | 'bed'
  | 'shower'
  | 'ruler-square'
  | 'home-variant';

export interface CarouselRenderItemInfo {
  item: string;
  index: number;
} 