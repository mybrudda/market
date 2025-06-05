export const vehiclePost: Post = {
    id: "a3421c80-63d2-4b69-9634-57dc92b55e33",
    user_id: "d8b8e370-6e10-4c75-9f4d-2b246ea9c045",
    title: "2018 Toyota Corolla SE",
    description: "Well-maintained Toyota Corolla with low mileage. Great condition inside and out.",
    post_type: "vehicle",
    listing_type: "sell",
    category: "sedan",
    price: 12500,
    currency: "USD",
    location: {
      city: "Los Angeles",
      address: "Ahmed Shah Street 1",
      country: "USA"
    },
    images: [
      "https://example.com/images/corolla-front.jpg",
      "https://example.com/images/corolla-side.jpg",
      "https://example.com/images/corolla-interior.jpg"
    ],
    details: {
      make: "Toyota",
      model: "Corolla",
      year: 2018,
      mileage: {
        value: 45000,
        unit: "km"
      },
      condition: "used",
      fuel_type: "petrol",
      transmission: "automatic",
      features: [
        "Bluetooth",
        "Backup Camera",
        "Cruise Control",
        "Apple CarPlay"
      ]
    },
    status: "active",
    created_at: "2025-06-05T10:30:00.000Z",
    updated_at: "2025-06-05T10:30:00.000Z",
    expiry_date: "2025-07-05T10:30:00.000Z"
  };



  export const RealEstatePost: Post = {
    id: "a3421c80-63d2-4b69-9634-57dc92b55e33",
    user_id: "d8b8e370-6e10-4c75-9f4d-2b246ea9c045",
    title: "2018 Toyota Corolla SE",
    description: "Well-maintained Toyota Corolla with low mileage. Great condition inside and out.",
    post_type: "vehicle",
    listing_type: "sell",
    category: "sedan",
    price: 12500,
    currency: "USD",
    location: {
      city: "Los Angeles",
      address: "Ahmed Shah Street 1",
      country: "USA"
    },
    images: [
      "https://example.com/images/corolla-front.jpg",
      "https://example.com/images/corolla-side.jpg",
      "https://example.com/images/corolla-interior.jpg"
    ],
    details: {
      size: {
        value: 200,
        unit: "metres",
      },
      rooms: 24,
      bathrooms: 10,
      year: 2015,
      condition: "good",
      features: ["wifi", "parking", "gym"],
    },
    status: "active",
    created_at: "2025-06-05T10:30:00.000Z",
    updated_at: "2025-06-05T10:30:00.000Z",
    expiry_date: "2025-07-05T10:30:00.000Z"
  };


  


  export const exampleUser: User = {
    id: "d8b8e370-6e10-4c75-9f4d-2b246ea9c045",
    username: "john_doe",
    full_name: "John Doe",
    avatar_url: "https://example.com/avatars/john.jpg",
    email: "john@example.com",
    is_verified: true,
    user_type: "seller",
    created_at: "2025-06-01T10:00:00.000Z"
  };