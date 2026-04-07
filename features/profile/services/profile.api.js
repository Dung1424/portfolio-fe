import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const profileService = {
  fetchByUsername(username, config = {}) {
    return axios.get(getUrlList().getUserByUserName(username), config)
  },
  fetchTotalLikes(username, config = {}) {
    return axios.get(getUrlList().getTotalLikes(username), config)
  },
  fetchPhotos(username, config = {}) {
    return axios.get(getUrlList().getPhotosByUserName(username), config)
  },
  fetchGalleries(username, config = {}) {
    return axios.get(getUrlList().getGalleriesByUserName(username), config)
  }
}
