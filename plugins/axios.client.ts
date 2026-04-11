import axios from 'axios'
import { installApiEnvelopeInterceptors } from '~/services/apiEnvelope.js'

export default defineNuxtPlugin(() => {
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
  installApiEnvelopeInterceptors(axios)
})
