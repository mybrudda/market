import type { VehicleDetails, RealEstateDetails } from './database';

// Base form type that matches database structure but with string inputs
export interface BaseFormData {
  title: string;
  description: string;
  price: string; // String for TextInput
  currency: string;
  images: string[]; // Base64 strings before upload
  listingType: 'rent' | 'sale';
  category: string;
  location: {
    city: string;
    address?: string | null;
    country?: string;
  };
}

// Vehicle form type that flattens the details for easier form handling
export interface VehicleFormData extends BaseFormData {
  // These fields will be transformed into VehicleDetails when saving
  make: string;
  model: string;
  year: string;
  mileage: string; // String for TextInput
  condition: string;
  fuelType: string; // Camel case for React
  transmission: string;
  features: string[];
}

// Real estate form type that flattens the details for easier form handling
export interface RealEstateFormData extends BaseFormData {
  // These fields will be transformed into RealEstateDetails when saving
  size: {
    value: string; // String for TextInput
    unit: string;
  };
  rooms: string; // String for TextInput
  bathrooms: string; // String for TextInput
  constructionYear: string;
  condition: string;
  features: string[];
}

// Helper type for form validation errors
export type FormErrors = {
  [K in keyof VehicleFormData | keyof RealEstateFormData | `location.${keyof BaseFormData['location']}`]?: string;
};

// Helper functions to transform form data to database format
export const transformVehicleForm = (form: VehicleFormData): VehicleDetails => ({
  make: form.make,
  model: form.model,
  year: form.year,
  mileage: {
    value: parseFloat(form.mileage),
    unit: 'km'
  },
  condition: form.condition,
  fuel_type: form.fuelType,
  transmission: form.transmission,
  features: form.features
});

export const transformRealEstateForm = (form: RealEstateFormData): RealEstateDetails => ({
  size: {
    value: parseFloat(form.size.value),
    unit: form.size.unit
  },
  rooms: parseInt(form.rooms),
  bathrooms: parseInt(form.bathrooms),
  year: form.constructionYear,
  condition: form.condition,
  features: form.features
}); 