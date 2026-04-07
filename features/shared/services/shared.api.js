import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

/** Feed blocks used by Explore / Following on the home discover page. */
export const sharedService = {
  fetchTopLikedPhotos(config = {}) {
    return axios.get(getUrlList().getTopLikedPhotos, config)
  },
  fetchTopUsersWithPhotos(config = {}) {
    return axios.get(getUrlList().getTopUsersWithPhotos, config)
  },
  fetchTopCategories(config = {}) {
    return axios.get(getUrlList().getTopCategories, config)
  },
  fetchTopLikedGalleries(config = {}) {
    return axios.get(getUrlList().getTopLikedGalleries, config)
  },
  fetchRecentFollowedPhotos(params, config = {}) {
    return axios.get(getUrlList().getRecentFollowedPhotos, { params, ...config })
  },
  fetchRecentFollowedGalleries(params, config = {}) {
    return axios.get(getUrlList().getRecentFollowedGalleries, { params, ...config })
  }
}
