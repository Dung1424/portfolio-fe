import { defineStore } from 'pinia'
import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'
import { notification } from 'ant-design-vue'

export const useReportStore = defineStore('report', {
  state: () => ({
    reports: []
  }),

  actions: {
    // Gửi báo cáo
    async reportContent({ reporterId, violatorId, reason, photoId, commentId, galleryId }) {
      try {
        const payload = {
          reporter_id: reporterId,
          violator_id: violatorId,
          report_reason: reason,
          photo_id: photoId || null,
          comment_id: commentId || null,
          gallery_id: galleryId || null
        }

        const response = await axios.post(getUrlList().reportViolation, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })

        // Lưu báo cáo vào state nếu cần
        const d = response.data
        const report = d.report ?? d
        if (report && typeof report === 'object') {
          this.reports.push(report)
        }

        notification.success({
          message: 'Reported successfully.',
          description: response.apiMessage || d?.message || '',
          placement: 'topRight',
          duration: 3
        })

        return d
      } catch (error) {
        console.error('Failed to send report:', error)
        const errorMessage = getErrorMessage(error, 'Unable to send report. Please try again.')
        notification.error({
          message: 'Error',
          description: errorMessage,
          placement: 'topRight',
          duration: 3
        })
        throw error
      }
    }
  }
})
