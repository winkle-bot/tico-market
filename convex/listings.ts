import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getListings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("listings").collect();
  },
});

export const addListing = mutation({
  args: {
    title: v.string(),
    price: v.string(),
    category: v.string(),
    sellerId: v.string(),
    owner: v.string(),
    rating: v.number(),
    type: v.string(),
    location: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("listings", args);
  },
});
