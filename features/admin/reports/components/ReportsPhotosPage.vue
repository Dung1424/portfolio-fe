<template>
  <ReportListPage title="Photo reports" variant="photo" :fetcher="fetchReports" />
</template>

<script setup>
import ReportListPage from './ReportListPage.vue'
import { reportsAdminApi } from '~/features/admin/reports/services/reports.api.js'

const fetchReports = query => reportsAdminApi.reportsPhotos(query)
</script>
