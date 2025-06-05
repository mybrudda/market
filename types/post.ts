export interface Post {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  created_at: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
    user_type: 'person' | 'company';
    is_verified: boolean | null;
  };
  details: {
    make: string;
    model: string;
    year: string;
    mileage: {
      value: number;
      unit: string;
    };
    condition: string;
    fuel_type?: string;
    transmission?: string;
  };
  location: {
    city: string;
    address?: string;
    country?: string;
  };
  post_type: 'vehicle' | 'realestate';
  listing_type: 'rent' | 'sale';
  category?: string;
  status?: string;
  expiry_date?: string;
  updated_at?: string;
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
  fuel_type?: string;
  transmission?: string;
  features?: string[];
}

export interface RealEstateDetails {
  category: string;
  rooms: number;
  bathrooms: number;
  year: string;
  condition: string;
  features: string[];
  size: {
    value: number;
    unit: string;
  };
}