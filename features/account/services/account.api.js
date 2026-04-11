import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const accountService = {
  fetchApprovedPhotos(config = {}) {
    return axios.get(getUrlList().getApprovedPhotos, config)
  },
  deletePhoto(photoId, config = {}) {
    return axios.delete(getUrlList().deletePhoto(photoId), config)
  },
  addGallery(payload, config = {}) {
    return axios.post(getUrlList().addGallery, payload, config)
  },
  deleteGallery(galleriesCode, config = {}) {
    return axios.delete(getUrlList().deleteGallery(galleriesCode), config)
  },
  fetchGalleryDetails(galleriesCode, config = {}) {
    return axios.get(getUrlList().getGalleryDetails(galleriesCode), config)
  },
  deletePhotoFromGallery(galleriesCode, photoId, config = {}) {
    return axios.delete(getUrlList().deletePhotoFromGallery(galleriesCode, photoId), config)
  },
  fetchPhotoForEdit(photoId, config = {}) {
    return axios.get(getUrlList().getPhoto(photoId), config)
  },
  fetchCategories(config = {}) {
    return axios.get(getUrlList().getCategories, config)
  },
  fetchTags(config = {}) {
    return axios.get(getUrlList().getTags, config)
  },
  fetchCategoriesAndTags() {
    const u = getUrlList()
    return Promise.all([axios.get(u.getCategories), axios.get(u.getTags)])
  },
  updatePhoto(photoId, payload, config = {}) {
    return axios.put(getUrlList().editPhoto(photoId), payload, config)
  },
  fetchLikedPhotos(config = {}) {
    return axios.get(getUrlList().getLikedPhotos, config)
  },
  fetchLikedGalleries(config = {}) {
    return axios.get(getUrlList().getLikedGalleries, config)
  },
  deleteLike(likeId, config = {}) {
    return axios.delete(getUrlList().deleteLike(likeId), config)
  },
  updateGallery(galleriesCode, payload, config = {}) {
    return axios.post(getUrlList().editGallery(galleriesCode), payload, config)
  }
}
