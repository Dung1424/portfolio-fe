<template>
    <div v-if="isVisible" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
        <div class="relative w-[500px] max-w-[90%] rounded-[10px] bg-white p-[30px] shadow-[0_6px_12px_rgba(0,0,0,0.3)]">
            <span class="absolute right-[15px] top-[15px] cursor-pointer text-[30px] text-[#666]" @click="closeModal">×</span>
            <h2 class="mb-[25px] text-center text-[26px] font-bold text-[#333]">Report Comment</h2>
            <div class="mb-[30px] flex flex-col gap-[15px]">
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="Spam or misleading content" />
                    Spam or misleading content
                </label>
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="Hateful or abusive content" />
                    Hateful or abusive content
                </label>
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="Harassment or hate speech" />
                    Harassment or hate speech
                </label>
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="Spam or misleading" />
                    Spam or misleading
                </label>
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="Violence or harmful behavior" />
                    Violence or harmful behavior
                </label>
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="Personal attacks or threats" />
                    Personal attacks or threats
                </label>
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="False information" />
                    False information
                </label>
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="Offensive language" />
                    Offensive language
                </label>
                <label class="flex cursor-pointer items-center gap-[10px] text-base text-[#333]">
                    <input type="radio" v-model="selectedReason" value="Other" />
                    Other
                </label>
                <div v-if="showDetailInput" class="mt-5 flex flex-col gap-[10px]">
                    <label for="detailReason" class="text-base font-bold text-[#333]">Tell us why to help us better understand:</label>
                    <textarea
                        id="detailReason"
                        v-model="detailReason"
                        placeholder="Enter your detailed reason here..."
                        rows="4"
                        class="w-full resize-y rounded-md border border-[#ccc] p-[10px] text-sm outline-none focus:border-[#007bff] focus:shadow-[0_0_5px_rgba(0,123,255,0.3)]"
                    ></textarea>
                </div>
            </div>
            <div class="flex justify-end gap-[15px]">
                <button class="cursor-pointer rounded-md bg-transparent px-5 py-[10px] text-base text-[#666] hover:bg-[#f0f0f0]" @click="closeModal">Cancel</button>
                <button class="cursor-pointer rounded-md bg-[#007bff] px-5 py-[10px] text-base text-white hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:bg-[#cccccc]" @click="submitReport" :disabled="!selectedReason">Report</button>
            </div>
        </div>
    </div>
</template>

<script>
import { useReportStore } from '~/stores/reportStore';
import { useUserStore } from '~/stores/userStore';
import { notification } from 'ant-design-vue';

export default {
    name: 'ReportCommentModal',
    props: {
        isVisible: {
            type: Boolean,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        commentId: {
            type: Number,
            default: null,
        },
        violatorId: {
            type: Number,
            required: true,
        }
    },
    emits: ['close'],
    data() {
        return {
            selectedReason: null,
            detailReason: '',
        };
    },
    computed: {
        reportStore() {
            return useReportStore();
        },
        userStore() {
            return useUserStore();
        },
        showDetailInput() {
            return this.selectedReason === 'Other';
        }
    },
    methods: {
        closeModal() {
            this.selectedReason = null;
            this.detailReason = '';
            this.$emit('close');
        },
        async submitReport() {
            if (!this.selectedReason) {
                notification.error({
                    message: 'Error',
                    description: 'Please select a reason for reporting.',
                    placement: 'topRight',
                    duration: 3,
                });
                return;
            }

            if (this.showDetailInput && !this.detailReason.trim()) {
                notification.error({
                    message: 'Error',
                    description: 'Please enter detailed reason.',
                    placement: 'topRight',
                    duration: 3,
                });
                return;
            }

            try {
                await this.userStore.fetchUserData();
                const reporterId = this.userStore.user?.id;

                if (!reporterId) {
                    throw new Error('User information not found.');
                }

                const reason = this.showDetailInput ? this.detailReason : this.selectedReason;

                const payload = {
                    reporterId,
                    violatorId: this.violatorId,
                    reason,
                    commentId: this.commentId,
                };

                await this.reportStore.reportContent(payload);
                this.closeModal();
            } catch {
                // Handle error (already handled in reportStore)
            }
        }
    }
};
</script>

