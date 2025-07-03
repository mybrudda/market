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
    "Car",
    "Truck",
    "Motorcycle",
    "Van",
    "Minivan",
    "Pickup Truck",
    "Bus",
    "Tractor",
    "Trailer",
    "Boat",
    "ATV/Quad Bike",
    "Scooter",
    "Bicycle",
    "Other"
  ];
  
  export const MAKES = [
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
  
  export const VEHICLE_CONDITION = [
    "New",
    "Excellent",
    "Good",
    "Fair",
    "Non-Operational",
  ];
  
  export const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid", "LPG/CNG", "Other"];
  
  export const TRANSMISSIONS = ["Automatic", "Manual", "CVT", "Semi-Automatic", "Other"];
  
  export const VEHICLE_FEATURES = [
    "Air Conditioning",
    "Airbags",
    "Bluetooth",
    "Navigation System",
    "Backup Camera",
    "Heated Seats",
    "Power Windows",
    "ABS (Anti-lock Brakes)",
    "Spare Tire",
    "Leather Seats",
  ];
  
  
  
  // Real Estate specific options:
  export const REAL_ESTATE_CATEGORIES: string[] = ["Apartment", "House", "Land", "Office", "Restaurant", "Shop", "Warehouse", "Farm", "Other"];
  
  
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