import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const followService = {
  fetchFollowingList(config = {}) {
    return axios.get(getUrlList().getFollowingList, config)
  },
  fetchFollowersList(config = {}) {
    return axios.get(getUrlList().getFollowersList, config)
  },
  fetchFollowingByUsername(username, config = {}) {
    return axios.get(getUrlList().getFollowingUser(username), config)
  },
  fetchFollowersByUsername(username, config = {}) {
    return axios.get(getUrlList().getFollowersUser(username), config)
  },
  followUser(payload, config = {}) {
    return axios.post(getUrlList().followUser, payload, config)
  },
  unfollowUser(userId, config = {}) {
    return axios.post(getUrlList().unfollowUser(userId), {}, config)
  }
}
