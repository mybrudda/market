// Vehicle specific options:
export const VEHICLE_CATEGORIES: string[] = [
  "Sedan",
  "SUV",
  "Truck",
  "Van",
  "Motorcycle",
  "Bus",
  "Other"
];

// New category and subcategory structure
export const CATEGORIES = [
  { label: 'Vehicle', value: 'vehicle' },
  { label: 'Other', value: 'other' }
];

export const VEHICLE_SUBCATEGORIES = [
  { label: 'Car', value: 'car' },
  { label: 'Motorcycle', value: 'motorcycle' },
  { label: 'Truck', value: 'truck' },
  { label: 'Van', value: 'van' },
  { label: 'Bus', value: 'bus' },
  { label: 'Parts', value: 'parts' },
  { label: 'Accessories', value: 'accessories' },
  { label: 'Other', value: 'other' }
];

export const OTHER_SUBCATEGORIES = [
  { label: 'General', value: 'general' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Furniture', value: 'furniture' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Books', value: 'books' },
  { label: 'Sports', value: 'sports' },
  { label: 'Other', value: 'other' }
];

export const LISTING_TYPES = [
  { label: 'Sale', value: 'sale' },
  { label: 'Rent', value: 'rent' },
  { label: 'Other', value: 'other' }
];

export const MAKES: string[] = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Bugatti",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Citroën",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Koenigsegg",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Lotus",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Pagani",
  "Peugeot",
  "Pontiac",
  "Porsche",
  "Ram",
  "Renault",
  "Rolls-Royce",
  "Saab",
  "Saturn",
  "Scion",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
  "Other"
];

export const VEHICLE_CONDITION: string[] = [
  "New",
  "Like New",
  "Excellent",
  "Good",
  "Fair",
  "Poor"
];

export const VEHICLE_FUEL_TYPES: string[] = [
  "Gasoline",
  "Diesel",
  "Electric",
  "Hybrid",
  "Plug-in Hybrid",
  "Hydrogen",
  "Other"
];

export const VEHICLE_TRANSMISSION: string[] = [
  "Automatic",
  "Manual",
  "CVT",
  "Semi-Automatic"
];

export const VEHICLE_MILEAGE_UNITS: string[] = [
  "km",
  "miles"
];

export const VEHICLE_FEATURES = [
  "Air Conditioning",
  "Power Windows",
  "Power Locks",
  "Power Steering",
  "ABS",
  "Airbags",
  "Bluetooth",
  "Navigation",
  "Backup Camera",
  "Cruise Control",
  "Heated Seats",
  "Leather Seats",
  "Sunroof",
  "Alloy Wheels",
  "Fog Lights",
  "Tinted Windows",
  "Alarm System",
  "Spare Tire",
];

// Common options:
export const YEARS: string[] = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());

export const CITIES: string[] = [
  "Kabul",
  "Kandahar",
  "Herat",
  "Mazar-e-Sharif",
  "Kunduz",
  "Jalalabad",
  "Ghazni",
  "Balkh",
  "Baghlan",
  "Khost",
  "Kunar",
  "Nangarhar",
  "Paktia",
  "Paktika",
  "Zabul",
  "Uruzgan",
  "Helmand",
  "Farah",
  "Nimroz",
  "Badghis",
  "Ghor",
  "Bamyan",
  "Daykundi",
  "Panjshir",
  "Kapisa",
  "Parwan",
  "Wardak",
  "Logar",
  "Nuristan",
  "Badakhshan",
  "Takhar",
  "Samangan",
  "Sar-e-Pul",
  "Faryab",
  "Jowzjan",
  "Other"
];

export const CURRENCIES: string[] = [
  "USD",
  "EUR",
  "GBP",
  "AFN",
  "PKR",
  "IRR",
  "Other"
];

export const COUNTRIES: string[] = [
  "Afghanistan",
  "Pakistan",
  "Iran",
  "Tajikistan",
  "Uzbekistan",
  "Turkmenistan",
  "China",
  "Other"
];

// Dropdown data helpers
export const vehicleCategoriesData = VEHICLE_CATEGORIES.map(category => ({ label: category, value: category }));
export const vehicleConditionData = VEHICLE_CONDITION.map(condition => ({ label: condition, value: condition }));
export const vehicleFuelTypesData = VEHICLE_FUEL_TYPES.map(fuelType => ({ label: fuelType, value: fuelType }));
export const vehicleTransmissionData = VEHICLE_TRANSMISSION.map(transmission => ({ label: transmission, value: transmission }));
export const vehicleMileageUnitsData = VEHICLE_MILEAGE_UNITS.map(unit => ({ label: unit, value: unit }));
export const yearsData = YEARS.map(year => ({ label: year, value: year }));
export const citiesData = CITIES.map(city => ({ label: city, value: city }));
export const currenciesData = CURRENCIES.map(currency => ({ label: currency, value: currency }));
export const countriesData = COUNTRIES.map(country => ({ label: country, value: country }));