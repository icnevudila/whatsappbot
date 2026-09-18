export const LIBRARY_PAGE_SIZE = 10

export type LibraryCreativeRow = {
  id: string
  title: string | null
  publicUrl: string | null
  thumbnailUrl?: string | null
  format?: string | null
  status: string
  source: string
  generationType: string
  createdAt: string
  error: string | null
  parentId: string | null
}
