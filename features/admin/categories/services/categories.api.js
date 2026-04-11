import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const categoriesAdminApi = {
  categories: query => adminHttp.get(p.categories, { params: query }),
  category: id => adminHttp.get(p.category(id)),
  createCategory: formData =>
    adminHttp.post(p.createCategory, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateCategory: (id, formData) =>
    adminHttp.post(p.updateCategory(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteCategory: id => adminHttp.delete(p.deleteCategory(id))
}

/** `data` sau interceptor unwrap — cùng shape với photo list (`categories` thay cho `photos`). */
export function categoriesListFromAdminBody(body) {
  return Array.isArray(body?.categories) ? body.categories : []
}
