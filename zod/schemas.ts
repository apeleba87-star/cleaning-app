import { z } from 'zod'

// GPS Location
export const gpsLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
})

// Checklist Item
export const checklistItemSchema = z.object({
  area: z.string().min(1),
  status: z.enum(['good', 'bad']),
  comment: z.string().optional(),
})

// Clock In
export const clockInSchema = z.object({
  store_id: z.string().uuid(),
  location: gpsLocationSchema,
  selfie_url: z.string().url().optional(),
})

// Clock Out
export const clockOutSchema = z.object({
  store_id: z.string().uuid(),
  location: gpsLocationSchema,
})

// Issue Create
export const issueCreateSchema = z.object({
  store_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
})

// Issue Status Update
export const issueStatusUpdateSchema = z.object({
  status: z.enum(['submitted', 'in_progress', 'completed', 'rejected']),
})

// Supply Request Create
export const supplyRequestCreateSchema = z.object({
  store_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  item_name: z.string().min(1).max(200),
  quantity: z.number().int().positive().optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
})

// Supply Request Status Update
export const supplyRequestStatusUpdateSchema = z.object({
  status: z.enum(['requested', 'received', 'completed', 'rejected']),
})

// Type exports
export type ClockInInput = z.infer<typeof clockInSchema>
export type ClockOutInput = z.infer<typeof clockOutSchema>
export type IssueCreateInput = z.infer<typeof issueCreateSchema>
export type IssueStatusUpdateInput = z.infer<typeof issueStatusUpdateSchema>
export type SupplyRequestCreateInput = z.infer<typeof supplyRequestCreateSchema>
export type SupplyRequestStatusUpdateInput = z.infer<typeof supplyRequestStatusUpdateSchema>
export type ChecklistItem = z.infer<typeof checklistItemSchema>
export type GPSLocation = z.infer<typeof gpsLocationSchema>

