import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const categoryService = {
  fetchCategories(config = {}) {
    return axios.get(getUrlList().getCategories, config)
  },
  fetchPhotosByCategorySlugs(slugs, config = {}) {
    return axios.get(getUrlList().getPhotosByCategorySlugs(slugs), config)
  }
}
