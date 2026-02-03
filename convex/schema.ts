import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  listings: defineTable({
    title: v.string(),
    price: v.string(),
    category: v.string(),
    sellerId: v.string(),
    owner: v.string(),
    rating: v.number(),
    type: v.string(), // 'seller' | 'driver'
    location: v.array(v.number()), // [lat, lng]
  }),
  sellers: defineTable({
    name: v.string(),
    rating: v.number(),
    joined: v.string(),
    location: v.string(),
    bio: v.string(),
  }),
  reviews: defineTable({
    sellerId: v.id("sellers"),
    user: v.string(),
    rating: v.number(),
    comment: v.string(),
    date: v.string(),
  }),
  messages: defineTable({
    sender: v.string(),
    text: v.string(),
    timestamp: v.number(),
  }),
});
