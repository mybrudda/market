// Form types, validation, and transformations
import type { VehicleDetails, RealEstateDetails } from './database';

export const VALIDATION_LIMITS = {
  IMAGES_PER_POST: 10,
  MIN_IMAGES: 1,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_PRICE: 0,
  MAX_PRICE: 999999999,
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

export const validateBaseForm = (form: BaseFormData): Partial<FormErrors> => {
  const errors: Partial<FormErrors> = {};

  if (!form.title.trim()) {
    errors.title = 'Title is required';
  } else if (form.title.length > VALIDATION_LIMITS.MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} characters or less`;
  }

  if (!form.description.trim()) {
    errors.description = 'Description is required';
  } else if (form.description.length > VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters or less`;
  }

  if (!form.price.trim()) {
    errors.price = 'Price is required';
  } else {
    const priceValue = parseFloat(form.price);
    if (isNaN(priceValue)) {
      errors.price = 'Price must be a valid number';
    } else if (priceValue < VALIDATION_LIMITS.MIN_PRICE) {
      errors.price = 'Price must be greater than 0';
    } else if (priceValue > VALIDATION_LIMITS.MAX_PRICE) {
      errors.price = 'Price is too high';
    }
  }

  if (!form.location.city.trim()) {
    errors['location.city'] = 'City is required';
  }

  if (!form.listingType) {
    errors.listingType = 'Listing type is required';
  }

  if (!form.category.trim()) {
    errors.category = 'Category is required';
  }

  if (form.images.length < VALIDATION_LIMITS.MIN_IMAGES) {
    errors.images = 'At least one image is required';
  } else if (form.images.length > VALIDATION_LIMITS.IMAGES_PER_POST) {
    errors.images = `Maximum ${VALIDATION_LIMITS.IMAGES_PER_POST} images allowed`;
  }

  return errors;
};

export const validateVehicleForm = (form: VehicleFormData): FormErrors => {
  const errors = validateBaseForm(form) as FormErrors;

  if (!form.make.trim()) errors.make = 'Make is required';
  if (!form.model.trim()) errors.model = 'Model is required';
  if (!form.year.trim()) errors.year = 'Year is required';
  
  if (!form.mileage.trim()) {
    errors.mileage = 'Mileage is required';
  } else {
    const mileageValue = parseFloat(form.mileage);
    if (isNaN(mileageValue) || mileageValue < 0) {
      errors.mileage = 'Mileage must be a valid positive number';
    }
  }

  if (!form.fuelType.trim()) errors.fuelType = 'Fuel type is required';
  if (!form.transmission.trim()) errors.transmission = 'Transmission is required';
  if (!form.condition.trim()) errors.condition = 'Condition is required';

  return errors;
};

export const validateRealEstateForm = (form: RealEstateFormData): FormErrors => {
  const errors = validateBaseForm(form) as FormErrors;

  if (!form.rooms.trim()) {
    errors.rooms = 'Number of rooms is required';
  } else {
    const roomsValue = parseInt(form.rooms);
    if (isNaN(roomsValue) || roomsValue < 1) {
      errors.rooms = 'Number of rooms must be a valid positive number';
    }
  }

  if (!form.size.value.trim()) {
    errors.size = 'Size is required';
  } else {
    const sizeValue = parseFloat(form.size.value);
    if (isNaN(sizeValue) || sizeValue <= 0) {
      errors.size = 'Size must be a valid positive number';
    }
  }

  if (!form.bathrooms.trim()) {
    errors.bathrooms = 'Number of bathrooms is required';
  } else {
    const bathroomsValue = parseInt(form.bathrooms);
    if (isNaN(bathroomsValue) || bathroomsValue < 0) {
      errors.bathrooms = 'Number of bathrooms must be a valid non-negative number';
    }
  }

  if (!form.constructionYear.trim()) errors.constructionYear = 'Construction year is required';
  if (!form.condition.trim()) errors.condition = 'Condition is required';

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