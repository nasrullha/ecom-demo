import { z } from "zod";

/** First human-readable message from a failed validation. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Some of the information is not valid.";
}

const money = z
  .number({ invalid_type_error: "Enter a valid price" })
  .min(0, "Price cannot be negative")
  .max(99999999.99, "Price is too large");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v ? v : undefined));

// ---------------------------------------------------------------- auth
export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(72),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(100),
  email: emailSchema,
  password: passwordSchema,
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\-\s]*$/, "Phone can only contain digits, spaces and + - ( )"),
});

// ------------------------------------------------------------ checkout
export const cartItemsSchema = z
  .array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(99),
    })
  )
  .min(1, "Your cart is empty")
  .max(50, "Too many different items in one order");

export const shippingSchema = z.object({
  name: z.string().trim().min(1, "Enter the recipient's name").max(100),
  phone: z
    .string()
    .trim()
    .min(3, "Enter a phone number")
    .max(30)
    .regex(/^[0-9+()\-\s]+$/, "Phone can only contain digits, spaces and + - ( )"),
  address: z.string().trim().min(1, "Enter the delivery address").max(300),
  city: z.string().trim().min(1, "Enter your island or area").max(100),
  atoll: z.string().trim().min(1, "Choose your atoll or area").max(60),
  deliveryMethod: z.enum(["courier", "vessel"]),
  vessel: z.string().trim().max(100, "Vessel name must be 100 characters or fewer").optional(),
  postalCode: z.string().trim().max(20).optional(),
  note: z.string().trim().max(500, "Note must be 500 characters or fewer").optional(),
});

export const placeOrderSchema = z.object({
  items: cartItemsSchema,
  shipping: shippingSchema,
});

// --------------------------------------------------------------- admin
export const productInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a product name").max(160),
  slug: optionalText(100),
  brand: optionalText(80),
  description: optionalText(5000),
  categoryId: z.string().uuid().nullable().optional(),
  price: money,
  compareAtPrice: money.nullable().optional(),
  optionNames: z.array(z.string().trim().min(1, "Option names cannot be empty").max(30)).max(3),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        sku: z.string().trim().max(64).nullable().optional(),
        options: z.record(z.string().trim().min(1, "Option values cannot be empty").max(40)),
        price: money.nullable().optional(),
        stock: z
          .number({ invalid_type_error: "Stock must be a whole number" })
          .int("Stock must be a whole number")
          .min(0, "Stock cannot be negative")
          .max(1000000),
        /** Stock when the form was opened. If unchanged, we don't overwrite live stock. */
        originalStock: z.number().int().optional(),
        isActive: z.boolean(),
      })
    )
    .min(1, "Add at least one variant")
    .max(100, "A product can have up to 100 variants"),
});

export const categoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a category name").max(80),
  slug: optionalText(100),
  description: optionalText(500),
  sortOrder: z.number().int().min(-1000).max(1000),
});

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1, "Enter a store name").max(80),
  bankName: optionalText(100),
  accountName: optionalText(100),
  accountNumber: optionalText(60),
  paymentInstructions: optionalText(1000),
  shippingFee: money,
  freeShippingThreshold: money.nullable(),
  lowStockThreshold: z.number().int().min(0).max(100000),
});

export const orderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "slip_uploaded", "approved", "delivered", "rejected"]),
  note: z.string().trim().max(500, "The note must be 500 characters or fewer").optional(),
});

export const dispatchSchema = z.object({
  orderId: z.string().uuid(),
  vessel: z.string().trim().max(100, "Vessel name must be 100 characters or fewer").optional(),
  note: z.string().trim().max(300, "The note must be 300 characters or fewer").optional(),
});
