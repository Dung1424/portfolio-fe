import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const blogService = {
  fetchLatest(config = {}) {
    return axios.get(getUrlList().getLatestBlogs, config)
  },
  fetchOlder(params, config = {}) {
    return axios.get(getUrlList().getOlderBlogs, { params, ...config })
  },
  fetchBySlug(slug, config = {}) {
    return axios.get(getUrlList().getBlogDetails(slug), config)
  }
}
