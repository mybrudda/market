export interface User {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  user_type: 'person' | 'company';
  is_verified: boolean | null;
}

export interface BasePost {
  id: string;
  user_id: string;
  user?: User;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  created_at: string;
  updated_at: string;
  expiry_date: string;
  post_type: 'vehicle' | 'realestate';
  listing_type: 'rent' | 'sale';
  category: string;
  status: 'active' | 'inactive' | 'deleted';
  location: {
    city: string;
    address?: string;
    country: string;
  };
}

export interface VehicleDetails {
  make: string;
  model: string;
  year: string;
  mileage: {
    value: number;
    unit: string;
  };
  condition: string;
  fuel_type: string;
  transmission: string;
  features: string[];
}

export interface RealEstateDetails {
  size: {
    value: number;
    unit: string;
  };
  rooms: number;
  bathrooms: number;
  year: string;
  condition: string;
  features: string[];
}

export interface VehiclePost extends BasePost {
  post_type: 'vehicle';
  details: VehicleDetails;
  user: User;
}

export interface RealEstatePost extends BasePost {
  post_type: 'realestate';
  details: RealEstateDetails;
  user: User;
}

export type Post = VehiclePost | RealEstatePost; 