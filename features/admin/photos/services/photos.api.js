import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const photosAdminApi = {
  photos: query => adminHttp.get(p.photos, { params: query }),
  photo: id => adminHttp.get(p.photo(id)),
  photoComments: (id, query) => adminHttp.get(p.photoComments(id), { params: query }),
  createPhoto: formData =>
    adminHttp.post(p.createPhoto, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updatePhoto: (id, formData) =>
    adminHttp.post(p.updatePhoto(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deletePhoto: id => adminHttp.delete(p.deletePhoto(id)),
  patchPhotoStatus: (id, status) => adminHttp.patch(p.patchPhotoStatus(id, status)),
  pendingPhotos: query => adminHttp.get(p.pendingPhotos, { params: query }),
  rejectedPhotos: query => adminHttp.get(p.rejectedPhotos, { params: query })
}
