export const listings = [
  { id: 1, sellerId: "carlos-123", title: "Coffee Maker", price: "₡15,000", category: "Home", location: [9.9281, -84.0907] as [number, number], rating: 4.8, type: 'seller', owner: "Carlos" },
  { id: 2, sellerId: "maria-456", title: "Mountain Bike", price: "₡120,000", category: "Vehicles", location: [9.9333, -84.0833] as [number, number], rating: 4.5, type: 'seller', owner: "Maria" },
  { id: 3, sellerId: "luis-789", title: "Delivery Pro", price: "Varies", category: "Delivery", location: [9.9350, -84.1000] as [number, number], rating: 5.0, type: 'driver', owner: "Express Luis" },
  { id: 4, sellerId: "ana-012", title: "Local Honey", price: "₡5,000", category: "Home", location: [9.9180, -84.0700] as [number, number], rating: 4.9, type: 'seller', owner: "Ana" },
];

export const categoryEmojis: Record<string, string> = {
  'Electronics': '💻',
  'Home': '🏠',
  'Vehicles': '🚗',
  'Delivery': '📦',
  'Food': '🍽️',
  'Services': '🛠️',
  'Fashion': '👗',
  'Sports': '⚽',
  'Other': '✨'
};

export const categories = [
  'Electronics',
  'Home',
  'Vehicles',
  'Food',
  'Services',
  'Fashion',
  'Sports',
  'Other'
];

export const sellers = [
  {
    id: "carlos-123",
    name: "Carlos",
    rating: 4.8,
    joined: "Jan 2024",
    location: "San José",
    bio: "Coffee enthusiast selling local gadgets and kitchenware.",
    reviews: [
      { id: 101, user: "Pedro", rating: 5, comment: "Excellent service, the coffee maker works perfectly!", date: "2 days ago" },
      { id: 102, user: "Elena", rating: 4, comment: "Good quality, minor scratch but overall happy.", date: "1 week ago" }
    ]
  },
  {
    id: "maria-456",
    name: "Maria",
    rating: 4.5,
    joined: "Dec 2023",
    location: "Escazú",
    bio: "Selling high-quality outdoor gear and bikes.",
    reviews: [
      { id: 201, user: "Juan", rating: 5, comment: "Bike was in perfect condition.", date: "5 days ago" }
    ]
  },
  {
    id: "luis-789",
    name: "Express Luis",
    rating: 5.0,
    joined: "Feb 2024",
    location: "Curridabat",
    bio: "Certified express delivery driver. Fast and reliable service across GAM.",
    reviews: [
      { id: 301, user: "Ana", rating: 5, comment: "Luis is the best! Delivered my honey in 20 minutes.", date: "1 hour ago" }
    ]
  },
  {
    id: "ana-012",
    name: "Ana",
    rating: 4.9,
    joined: "Nov 2023",
    location: "Heredia",
    bio: "Local producer of organic honey and wax products.",
    reviews: [
      { id: 401, user: "Carlos", rating: 5, comment: "Best honey in the country.", date: "3 days ago" }
    ]
  }
];
