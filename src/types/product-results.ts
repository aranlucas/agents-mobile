import { z } from "zod";

export const PRODUCT_RESULTS_TOOL_NAME = "show_product_results";

const productSchema = z.object({
  upc: z.string().regex(/^\d{1,13}$/),
  name: z.string().min(1).max(160),
  brand: z.string().max(80).optional(),
  size: z.string().max(40).optional(),
  price: z.number().nonnegative().optional(),
  regularPrice: z.number().nonnegative().optional(),
  pickup: z.boolean().optional(),
});

export const productResultsSchema = z.object({
  title: z.string().max(80).optional(),
  products: z.array(productSchema).min(1).max(10),
});

export type ProductResults = z.infer<typeof productResultsSchema>;

export type Product = z.infer<typeof productSchema>;
