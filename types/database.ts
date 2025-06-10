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
  post_type: 'vehicle' | 'realestate';
  listing_type: 'rent' | 'sale';
  category: string;
  price: number;
  currency: string ;
  location: {
    city: string;
    address?: string;
    country: string;
  } ;
  images: string[];
  details: VehicleDetails | RealEstateDetails;
  status: 'active' | 'pending' | 'removed' | 'expired';
  expiry_date: string ;
  created_at: string ;
  updated_at: string ;
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
  rooms: number | null;
  bathrooms: number | null;
  year: string | null;
  condition: string | null;
  features: string[] | null;
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