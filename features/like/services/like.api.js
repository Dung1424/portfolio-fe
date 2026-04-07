import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const likeService = {
  fetchLikedPhotos(config = {}) {
    return axios.get(getUrlList().getLikedPhotos, config)
  },
  fetchLikedGalleries(config = {}) {
    return axios.get(getUrlList().getLikedGalleries, config)
  },
  deleteLike(likeId, config = {}) {
    return axios.delete(getUrlList().deleteLike(likeId), config)
  },
  likePhoto(payload, config = {}) {
    return axios.post(getUrlList().likePhoto, payload, config)
  },
  unlikePhoto(payload, config = {}) {
    return axios.post(getUrlList().unlikePhoto, payload, config)
  },
  likeGallery(payload, config = {}) {
    return axios.post(getUrlList().likeGallery, payload, config)
  },
  unlikeGallery(payload, config = {}) {
    return axios.post(getUrlList().unlikeGallery, payload, config)
  }
}
