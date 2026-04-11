import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const photoService = {
  fetchDetail(token, config = {}) {
    return axios.get(getUrlList().getPhotoDetail(token), config)
  },
  fetchPhotoLikes(token, config = {}) {
    return axios.get(getUrlList().getPhotoLikes(token), config)
  },
  fetchRelatedPhotos(token, config = {}) {
    return axios.get(getUrlList().getRelatedPhotos(token), config)
  },
  fetchRelatedGalleries(token, config = {}) {
    return axios.get(getUrlList().getRelatedGalleries(token), config)
  },
  fetchUserByUsername(username, config = {}) {
    return axios.get(getUrlList().getUserByUserName(username), config)
  },
  fetchCategories(config = {}) {
    return axios.get(getUrlList().getCategories, config)
  },
  fetchCategoriesAndTags() {
    const u = getUrlList()
    return Promise.all([axios.get(u.getCategories), axios.get(u.getTags)])
  },
  uploadPhoto(formData, config = {}) {
    return axios.post(getUrlList().addPhoto, formData, config)
  }
}
