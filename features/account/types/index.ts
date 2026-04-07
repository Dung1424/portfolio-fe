/** My account (photos, galleries, likes) payloads & shapes. */

export interface GalleryFormPayload {
  title: string
  description?: string
  visibility: string | number
}
