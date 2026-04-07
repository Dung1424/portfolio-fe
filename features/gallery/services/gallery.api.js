import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const galleryService = {
  fetchPublicByCode(galleriesCode, config = {}) {
    return axios.get(getUrlList().getGalleryDetailUser(galleriesCode), config)
  },
  fetchMyGalleries(config = {}) {
    return axios.get(getUrlList().getGallery, config)
  },
  addPhotoToGallery(payload, config = {}) {
    return axios.post(getUrlList().addPhotoToGallery, payload, config)
  }
}
