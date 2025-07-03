// Form types, validation, and transformations
import type { VehicleDetails, RealEstateDetails } from './database';

/**
 * Validation limits and constraints for form fields
 */
export const VALIDATION_LIMITS = {
  // Image constraints
  IMAGES_PER_POST: 10,
  MIN_IMAGES: 1,
  
  // Text length constraints
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  
  // Price constraints
  MIN_PRICE: 0,
  MAX_PRICE: 999999999,
} as const;

/**
 * Default form values for initialization
 */
export const DEFAULT_FORM_VALUES = {
  CURRENCY: 'USD',
  LISTING_TYPE: 'sale' as const,
  COUNTRY: 'AF',
  IMAGE_QUALITY: 1,
  IMAGE_ASPECT: [4, 3] as const,
  POST_EXPIRY_DAYS: 30,
} as const;

export interface BaseFormData {
  title: string;
  description: string;
  price: string;
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

export interface VehicleFormData extends BaseFormData {
  make: string;
  model: string;
  year: string;
  mileage: string;
  condition: string;
  fuelType: string;
  transmission: string;
  features: string[];
}

export interface RealEstateFormData extends BaseFormData {
  size: {
    value: string;
    unit: string;
  };
  rooms: string;
  bathrooms: string;
  constructionYear: string;
  condition: string;
  features: string[];
}

export type FormErrors = {
  [K in keyof VehicleFormData | keyof RealEstateFormData | `location.${keyof BaseFormData['location']}`]?: string;
};

// Helper validation functions
const validateRequiredField = (value: string, fieldName: string): string | undefined => {
  return !value.trim() ? `${fieldName} is required` : undefined;
};

const validateNumericField = (
  value: string, 
  fieldName: string, 
  min: number = 0, 
  allowZero: boolean = false
): string | undefined => {
  if (!value.trim()) {
    return `${fieldName} is required`;
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (allowZero ? numValue < min : numValue <= min) {
    return `${fieldName} must be a valid positive number`;
  }
  
  return undefined;
};

const validateIntegerField = (
  value: string, 
  fieldName: string, 
  min: number = 0, 
  allowZero: boolean = false
): string | undefined => {
  if (!value.trim()) {
    return `${fieldName} is required`;
  }
  
  const intValue = parseInt(value);
  if (isNaN(intValue)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (allowZero ? intValue < min : intValue <= min) {
    return `${fieldName} must be a valid positive number`;
  }
  
  return undefined;
};

export const validateBaseForm = (form: BaseFormData): Partial<FormErrors> => {
  const errors: Partial<FormErrors> = {};

  // Title validation
  if (!form.title.trim()) {
    errors.title = 'Title is required';
  } else if (form.title.length > VALIDATION_LIMITS.MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} characters or less`;
  }

  // Description validation
  if (!form.description.trim()) {
    errors.description = 'Description is required';
  } else if (form.description.length > VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters or less`;
  }

  // Price validation
  const priceError = validateNumericField(form.price, 'Price', VALIDATION_LIMITS.MIN_PRICE, false);
  if (priceError) {
    errors.price = priceError;
  } else {
    const priceValue = parseFloat(form.price);
    if (priceValue > VALIDATION_LIMITS.MAX_PRICE) {
      errors.price = 'Price is too high';
    }
  }

  // Location validation
  if (!form.location.city.trim()) {
    errors['location.city'] = 'City is required';
  }

  // Listing type validation
  if (!form.listingType) {
    errors.listingType = 'Listing type is required';
  }

  // Category validation
  if (!form.category.trim()) {
    errors.category = 'Category is required';
  }

  // Images validation
  if (form.images.length < VALIDATION_LIMITS.MIN_IMAGES) {
    errors.images = 'At least one image is required';
  } else if (form.images.length > VALIDATION_LIMITS.IMAGES_PER_POST) {
    errors.images = `Maximum ${VALIDATION_LIMITS.IMAGES_PER_POST} images allowed`;
  }

  return errors;
};

export const validateVehicleForm = (form: VehicleFormData): FormErrors => {
  const errors = validateBaseForm(form) as FormErrors;

  // Required string fields
  const requiredFields = [
    { field: form.make, name: 'Make' },
    { field: form.model, name: 'Model' },
    { field: form.year, name: 'Year' },
    { field: form.fuelType, name: 'Fuel type' },
    { field: form.transmission, name: 'Transmission' },
    { field: form.condition, name: 'Condition' }
  ];

  requiredFields.forEach(({ field, name }) => {
    const error = validateRequiredField(field, name);
    if (error) {
      errors[name.toLowerCase().replace(' ', '') as keyof FormErrors] = error;
    }
  });

  // Mileage validation
  const mileageError = validateNumericField(form.mileage, 'Mileage', 0, false);
  if (mileageError) {
    errors.mileage = mileageError;
  }

  return errors;
};

export const validateRealEstateForm = (form: RealEstateFormData): FormErrors => {
  const errors = validateBaseForm(form) as FormErrors;

  // Rooms validation
  const roomsError = validateIntegerField(form.rooms, 'Number of rooms', 1, false);
  if (roomsError) {
    errors.rooms = roomsError;
  }

  // Size validation
  const sizeError = validateNumericField(form.size.value, 'Size', 0, false);
  if (sizeError) {
    errors.size = sizeError;
  }

  // Bathrooms validation
  const bathroomsError = validateIntegerField(form.bathrooms, 'Number of bathrooms', 0, true);
  if (bathroomsError) {
    errors.bathrooms = bathroomsError;
  }

  // Required string fields
  const requiredFields = [
    { field: form.constructionYear, name: 'Construction year' },
    { field: form.condition, name: 'Condition' }
  ];

  requiredFields.forEach(({ field, name }) => {
    const error = validateRequiredField(field, name);
    if (error) {
      errors[name.toLowerCase().replace(' ', '') as keyof FormErrors] = error;
    }
  });

  return errors;
};

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