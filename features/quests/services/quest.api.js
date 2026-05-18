import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'
import { installApiEnvelopeInterceptors } from '~/services/apiEnvelope.js'

const questHttp = axios.create()

installApiEnvelopeInterceptors(questHttp)

questHttp.interceptors.request.use((config) => {
  if (import.meta.client) {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export const questApi = {
  quests: query => questHttp.get(getUrlList().quests, { params: query }),
  quest: id => questHttp.get(getUrlList().quest(id)),
  submit: (questId, formData) =>
    questHttp.post(getUrlList().submitQuest(questId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  wallet: () => questHttp.get(getUrlList().wallet),
  convertStars: stars => questHttp.post(getUrlList().convertStars, { stars }),
  storeItems: query => questHttp.get(getUrlList().storeItems, { params: query }),
  redeem: itemId => questHttp.post(getUrlList().redeemStoreItem(itemId)),
  review: (submissionId, payload) => questHttp.post(getUrlList().juryReview(submissionId), payload)
}
