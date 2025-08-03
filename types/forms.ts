// Form types, validation, and transformations
import type { VehicleDetails } from './database';

export interface BaseFormData {
  title: string;
  description: string;
  price: string;
  currency: string;
  location: {
    city: string;
    address?: string;
    country: string;
  };
  images: string[];
  listingType: 'sale' | 'rent' | 'other';
  category: 'vehicle' | 'other';
  subcategory: string;
}

export interface VehicleFormData extends BaseFormData {
  make: string;
  model: string;
  year: string;
  mileage: {
    value: string;
    unit: string;
  };
  fuelType: string;
  transmission: string;
  condition: string;
  features: string[];
}

export type FormErrors = {
  [K in keyof VehicleFormData | `location.${keyof BaseFormData['location']}`]?: string;
};

export const VALIDATION_LIMITS = {
  TITLE_MIN: 3,
  TITLE_MAX: 100,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 1000,
  PRICE_MIN: 0,
  PRICE_MAX: 999999999,
  IMAGES_MIN: 1,
  IMAGES_MAX: 10,
  IMAGES_PER_POST: 10,
  MIN_IMAGES: 1,
  MILEAGE_MIN: 0,
  MILEAGE_MAX: 999999,
  YEAR_MIN: 1900,
  YEAR_MAX: new Date().getFullYear() + 1,
} as const;

export const DEFAULT_FORM_VALUES = {
  CURRENCY: 'USD',
  COUNTRY: 'US',
  LISTING_TYPE: 'sale' as const,
  POST_EXPIRY_DAYS: 30,
  IMAGE_QUALITY: 1,
  IMAGE_ASPECT: [4, 3] as const,
} as const;

export const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Please log in to create a post.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  SUPABASE_CONNECTION_FAILED: (error: string) => `Database connection failed: ${error}`,
  POST_NOT_FOUND: 'Post not found or you do not have permission to edit it.',
  IMAGE_UPLOAD_FAILED: 'Failed to upload image. Please try again.',
  IMAGE_PICK_FAILED: 'Failed to pick image. Please try again.',
  IMAGE_LIMIT_REACHED: (limit: number) => `You can only select up to ${limit} images.`,
  POST_CREATION_FAILED: 'Failed to create post. Please try again.',
  POST_UPDATE_FAILED: 'Failed to update post. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

export const validateVehicleForm = (form: VehicleFormData): FormErrors => {
  const errors: FormErrors = {};

  // Title validation
  if (!form.title.trim()) {
    errors.title = 'Title is required';
  } else if (form.title.length < VALIDATION_LIMITS.TITLE_MIN) {
    errors.title = `Title must be at least ${VALIDATION_LIMITS.TITLE_MIN} characters`;
  } else if (form.title.length > VALIDATION_LIMITS.TITLE_MAX) {
    errors.title = `Title must be no more than ${VALIDATION_LIMITS.TITLE_MAX} characters`;
  }

  // Description validation
  if (!form.description.trim()) {
    errors.description = 'Description is required';
  } else if (form.description.length < VALIDATION_LIMITS.DESCRIPTION_MIN) {
    errors.description = `Description must be at least ${VALIDATION_LIMITS.DESCRIPTION_MIN} characters`;
  } else if (form.description.length > VALIDATION_LIMITS.DESCRIPTION_MAX) {
    errors.description = `Description must be no more than ${VALIDATION_LIMITS.DESCRIPTION_MAX} characters`;
  }

  // Price validation
  const price = parseFloat(form.price);
  if (isNaN(price) || price < VALIDATION_LIMITS.PRICE_MIN) {
    errors.price = 'Price must be a positive number';
  } else if (price > VALIDATION_LIMITS.PRICE_MAX) {
    errors.price = `Price must be no more than ${VALIDATION_LIMITS.PRICE_MAX.toLocaleString()}`;
  }

  // Currency validation
  if (!form.currency) {
    errors.currency = 'Currency is required';
  }

  // Location validation
  if (!form.location.city.trim()) {
    errors['location.city'] = 'City is required';
  }
  if (!form.location.country.trim()) {
    errors['location.country'] = 'Country is required';
  }

  // Images validation
  if (!form.images || form.images.length < VALIDATION_LIMITS.IMAGES_MIN) {
    errors.images = `At least ${VALIDATION_LIMITS.IMAGES_MIN} image is required`;
  } else if (form.images.length > VALIDATION_LIMITS.IMAGES_MAX) {
    errors.images = `No more than ${VALIDATION_LIMITS.IMAGES_MAX} images allowed`;
  }

  // Listing type validation
  if (!form.listingType) {
    errors.listingType = 'Listing type is required';
  }

  // Category validation
  if (!form.category) {
    errors.category = 'Category is required';
  }

  // Subcategory validation
  if (!form.subcategory.trim()) {
    errors.subcategory = 'Subcategory is required';
  }

  // Vehicle-specific validations
  if (!form.make.trim()) {
    errors.make = 'Make is required';
  }

  if (!form.model.trim()) {
    errors.model = 'Model is required';
  }

  // Year validation
  const year = parseInt(form.year);
  if (isNaN(year) || year < VALIDATION_LIMITS.YEAR_MIN || year > VALIDATION_LIMITS.YEAR_MAX) {
    errors.year = `Year must be between ${VALIDATION_LIMITS.YEAR_MIN} and ${VALIDATION_LIMITS.YEAR_MAX}`;
  }

  // Mileage validation
  const mileage = parseFloat(form.mileage.value);
  if (isNaN(mileage) || mileage < VALIDATION_LIMITS.MILEAGE_MIN) {
    errors.mileage = 'Mileage must be a positive number';
  } else if (mileage > VALIDATION_LIMITS.MILEAGE_MAX) {
    errors.mileage = `Mileage must be no more than ${VALIDATION_LIMITS.MILEAGE_MAX.toLocaleString()}`;
  }

  if (!form.mileage.unit) {
    errors.mileage = 'Mileage unit is required';
  }

  // Fuel type validation
  if (!form.fuelType) {
    errors.fuelType = 'Fuel type is required';
  }

  // Transmission validation
  if (!form.transmission) {
    errors.transmission = 'Transmission is required';
  }

  // Condition validation
  if (!form.condition) {
    errors.condition = 'Condition is required';
  }

  return errors;
};

export const transformVehicleForm = (form: VehicleFormData): VehicleDetails => ({
  make: form.make.trim(),
  model: form.model.trim(),
  year: form.year,
  mileage: {
    value: parseFloat(form.mileage.value),
    unit: form.mileage.unit,
  },
  fuel_type: form.fuelType,
  transmission: form.transmission,
  condition: form.condition,
  features: form.features || [],
}); 