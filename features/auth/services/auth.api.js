import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

const FORM_URLENCODED = { 'Content-Type': 'application/x-www-form-urlencoded' }

function asUrlEncodedForm(payload) {
  const p = new URLSearchParams()
  for (const [key, value] of Object.entries(payload)) {
    if (value != null && value !== '') {
      p.append(key, String(value))
    }
  }
  return p
}

/** Auth-related HTTP calls (URLs still come from shared getUrlList). */
export const authService = {
  login: payload => axios.post(getUrlList().login, payload),
  register: payload => axios.post(getUrlList().register, payload),
  forgotPassword: payload =>
    axios.post(getUrlList().forgotPassword, asUrlEncodedForm(payload), { headers: FORM_URLENCODED }),
  resetPassword: payload =>
    axios.post(getUrlList().resetPassword, asUrlEncodedForm(payload), { headers: FORM_URLENCODED }),
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
