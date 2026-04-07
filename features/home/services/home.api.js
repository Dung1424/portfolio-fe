import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const homeService = {
  fetchPhotoFeed(params, config = {}) {
    return axios.get(getUrlList().getPhotoData, { params, ...config })
  },
  fetchFollowFeed(config = {}) {
    return axios.get(getUrlList().getFollowData, config)
  },
  fetchCategories(config = {}) {
    return axios.get(getUrlList().getCategories, config)
  },
  fetchPhotosByCategorySlugs(slugs, config = {}) {
    return axios.get(getUrlList().getPhotosByCategorySlugs(slugs), config)
  }
}
