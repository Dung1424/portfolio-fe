import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const blogsAdminApi = {
  blogs: query => adminHttp.get(p.blogs, { params: query }),
  blog: id => adminHttp.get(p.blog(id)),
  createBlog: formData =>
    adminHttp.post(p.createBlog, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateBlog: (id, formData) =>
    adminHttp.post(p.updateBlog(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteBlog: id => adminHttp.delete(p.deleteBlog(id))
}
