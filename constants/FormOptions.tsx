export const CITIES: string[] = [
    "Aibak",
    "Asadabad",
    "Bamyan",
    "Bazarak",
    "Charikar",
    "Faizabad",
    "Farah",
    "Gardez",
    "Ghazni",
    "Herat",
    "Ibrahim Khan",
    "Injil",
    "Jabal us Saraj",
    "Jalalabad",
    "Kalakan",
    "Kabul",
    "Kandahar",
    "Khost",
    "Kunduz",
    "Lashkar Gah",
    "Maidan Shahr",
    "Maimana",
    "Mahmud-e Raqi",
    "Mazar-e Sharif",
    "Mehtar Lam",
    "Mir Bachah Kot",
    "Nadir Shah Kot",
    "Nadir Shah Kot",
    "Nili",
    "Paghman",
    "Pul-e Khumri",
    "Pul-e Alam",
    "Qala-ye Now",
    "Qalat",
    "Qarah Bagh Bazar",
    "Sar-e Pul",
    "Sharan",
    "Shibirghan",
    "Tarin Kot",
    "Talqan",
    "Zaranj",
  ];
  
  export const SALE_RENT_OPTIONS: string[] = ["Sale", "Rent"];
  
  const currentYear = new Date().getFullYear();
  export const YEARS: string[] = Array.from(
    { length: currentYear - 1970 + 1 },
    (_, i) => (currentYear - i).toString()
  );
  
  
  // Vehicle-specific constants
  export const VEHICLE_CATEGORIES = [
    "Sedan",
    "SUV",
    "Truck",
    "Hatchback",
    "Coupe",
    "Convertible",
    "Minivan",
    "Motorcycle",
    "Commercial",
  ];
  
  export const MAKES = [
    "Toyota",
    "Honda",
    "Ford",
    "Chevrolet",
    "BMW",
    "Mercedes",
    "Audi",
    "Hyundai",
    "Kia",
    "Nissan",
  ];
  
  export const VEHICLE_CONDITION = ["Operational", "Non-Operational"];
  
  export const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"];
  
  export const TRANSMISSIONS = ["Automatic", "Manual"];
  
  export const VEHICLE_FEATURES = [
    "Air Conditioning",
    "Airbags",
    "Bluetooth",
    "Navigation",
    "Backup Camera",
    "Leather Seats",
    "Sunroof",
  ];
  
  
  
  // Real Estate specific options:
  export const REAL_ESTATE_CATEGORIES: string[] = ["Apartment", "House", "Land", "Office", "Restaurant", "Shop", "Warehouse", "Farm"];
  
  
  export const PROPERTY_FEATURES = [
    "Swimming Pool",
    "Garden",
    "Guest House",
    "Parking",
    "Balcony",
    "Elevator",
  ];
  
  export const REAL_ESTATE_CONDITION = [
    "New",
    "Excellent",
    "Good",
    "Fair",
    "Needs Renovation",
  ];