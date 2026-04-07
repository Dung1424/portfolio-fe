import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const searchService = {
  search(q, config = {}) {
    const term = q ?? ''
    return axios.get(`${getUrlList().searchPhotos}?q=${encodeURIComponent(term)}`, config)
  }
}
