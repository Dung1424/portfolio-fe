import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const commentService = {
  fetchByPhotoToken(token, params, config = {}) {
    return axios.get(`${getUrlList().getCommentsByPhotoToken}/${token}`, {
      params,
      ...config
    })
  },
  postComment(payload, config = {}) {
    return axios.post(getUrlList().postComment, payload, config)
  },
  deleteComment(commentId, config = {}) {
    return axios.delete(getUrlList().deleteComment(commentId), config)
  }
}
