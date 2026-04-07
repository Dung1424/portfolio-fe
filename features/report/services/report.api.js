import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const reportService = {
  reportViolation(payload, config = {}) {
    return axios.post(getUrlList().reportViolation, payload, config)
  }
}
