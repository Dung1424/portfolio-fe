import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const searchService = {
  /** GET /Search/Photos?q= — ảnh public approved (q có thể rỗng theo backend). */
  searchPhotos(q, config = {}) {
    const term = q ?? ''
    return axios.get(`${getUrlList().searchPhotos}?q=${encodeURIComponent(term)}`, config)
  },
  /** GET /Search/Galleries?q= — gallery public. */
  searchGalleries(q, config = {}) {
    const term = q ?? ''
    return axios.get(`${getUrlList().searchGalleries}?q=${encodeURIComponent(term)}`, config)
  },
  /** GET /Search/Users?q= — photographer / user (public fields). */
  searchUsers(q, config = {}) {
    const term = q ?? ''
    return axios.get(`${getUrlList().searchUsers}?q=${encodeURIComponent(term)}`, config)
  },
}
