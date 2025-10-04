import { z } from "zod";

// IATA code validation
const IATACode = z
  .string()
  .regex(/^[A-Z]{3}$/, "IATA code must be 3 uppercase letters");

// Date in YYYY-MM-DD and >= 14 days ahead
const FutureDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return false;
    const min = new Date();
    min.setDate(min.getDate() + 14);
    return parsed >= min;
  }, "Departure date must be at least 14 days from today (Paylater requirement)");

// --- Base object (no refine) ---
export const MultiCitySegmentObject = z.object({
  id: z.string().uuid().optional(),
  search_params_id: z.string().uuid().optional(),
  sequence_order: z.number().int().positive(),
  origin_code: IATACode,
  origin_name: z.string().min(1),
  destination_code: IATACode,
  destination_name: z.string().min(1),
  departure_date: FutureDate,
});

// Full schema (refined)
export const MultiCitySegmentSchema = MultiCitySegmentObject.refine(
  (data) => data.origin_code !== data.destination_code,
  {
    message: "Origin and destination must be different",
    path: ["destination_code"],
  }
);

export type MultiCitySegment = z.infer<typeof MultiCitySegmentObject>;

// Input schemas derived from the BASE object (so .omit/.partial work)
export const CreateMultiCitySegmentSchema =
  MultiCitySegmentObject.omit({ id: true });
export type CreateMultiCitySegmentInput = z.infer<
  typeof CreateMultiCitySegmentSchema
>;

export const UpdateMultiCitySegmentSchema = MultiCitySegmentObject.partial().omit(
  { id: true, search_params_id: true }
);
export type UpdateMultiCitySegmentInput = z.infer<
  typeof UpdateMultiCitySegmentSchema
>;