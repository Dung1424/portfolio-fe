import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const notificationService = {
  fetchPage(params, config = {}) {
    return axios.get(getUrlList().getUserNotifications, { params, ...config })
  },
  markAsRead(payload, config = {}) {
    return axios.post(getUrlList().markNotificationAsRead, payload, config)
  }
}
