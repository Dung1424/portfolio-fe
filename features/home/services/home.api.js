import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const homeService = {
  fetchPhotoFeed(params, config = {}) {
    return axios.get(getUrlList().getPhotoData, { params, ...config })
  },
  fetchFollowFeed(config = {}) {
    return axios.get(getUrlList().getFollowData, config)
  },
  /** Explore / Following trên trang home */
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
