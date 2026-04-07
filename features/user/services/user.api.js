import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

/** Current authenticated user (profile from `/api/user`, update profile). */
export const userService = {
  fetchCurrentUser(config = {}) {
    return axios.get(getUrlList().getUser, config)
  },
  updateProfile(formData, config = {}) {
    return axios.post(getUrlList().updateProfile, formData, config)
  }
}
