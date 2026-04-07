import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

/** Auth-related HTTP calls (URLs still come from shared getUrlList). */
export const authService = {
  login: payload => axios.post(getUrlList().login, payload),
  register: payload => axios.post(getUrlList().register, payload),
  refreshToken: refreshToken =>
    axios.post(getUrlList().refreshToken, {}, {
      headers: { Authorization: `Bearer ${refreshToken}` }
    }),
  logout: token =>
    axios.post(getUrlList().logout, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  changePassword: (token, body) =>
    axios.post(getUrlList().changePassword, body, {
      headers: { Authorization: `Bearer ${token}` }
    })
}
