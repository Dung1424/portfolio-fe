import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const blockService = {
  fetchBlockedUsers(config = {}) {
    return axios.get(getUrlList().getBlockedUsers, config)
  },
  blockUser(payload, config = {}) {
    return axios.post(getUrlList().blockUser, payload, config)
  },
  unblockUser(payload, config = {}) {
    return axios.post(getUrlList().unblockUser, payload, config)
  }
}
