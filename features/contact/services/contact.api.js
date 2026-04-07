import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

export const contactService = {
  send(payload) {
    return axios.post(getUrlList().sendContact, payload)
  }
}
