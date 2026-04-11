<template>
    <div
        v-if="isVisible"
        class="fixed inset-0 z-[1000] flex justify-end bg-black/50"
    >
        <div class="flex h-full w-full max-w-[500px] flex-col bg-white p-5 shadow-[-2px_0_8px_rgba(0,0,0,0.1)]">
            <div class="mb-5 flex items-center justify-between">
                <h2 class="m-0 text-xl font-semibold text-zinc-900">Edit Profile</h2>
                <button type="button" class="cursor-pointer border-0 bg-transparent text-3xl text-zinc-600" aria-label="Close" @click="closeModal">
                    <i class="fa-solid fa-xmark" />
                </button>
            </div>

            <div class="mb-5 flex-1 overflow-y-auto">
                <div class="relative mb-5">
                    <div class="my-2.5 text-center">
                        <img
                            :src="getFullImageUrl(tempUser.cover_photo, 'blackImage.jpeg')"
                            alt="Cover Preview"
                            class="h-[200px] w-full rounded-lg object-cover"
                        />
                    </div>
                    <label
                        class="absolute right-2.5 top-2.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#0870d1] text-white"
                        @click="selectCoverImage"
                    >
                        <i class="fa-solid fa-pencil-alt" />
                    </label>
                </div>

                <div class="-mt-[70px] mb-5 flex justify-center">
                    <div class="relative inline-block">
                        <img
                            :src="getFullImageUrl(tempUser.profile_picture, 'imageUserDefault.png')"
                            alt="Profile Preview"
                            class="h-[100px] w-[100px] rounded-full border-2 border-white object-cover shadow-md"
                        />
                        <label
                            class="absolute -bottom-1 -right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#0870d1] text-white shadow"
                            @click="selectProfileImage"
                        >
                            <i class="fa-solid fa-pencil-alt" />
                        </label>
                    </div>
                </div>

                <div class="my-4">
                    <label for="username" class="font-medium text-zinc-800">Username:</label>
                    <input
                        id="username"
                        v-model="tempUser.username"
                        type="text"
                        placeholder="Enter your username"
                        maxlength="50"
                        class="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    />
                    <small class="mt-1 block text-xs text-zinc-500">{{ tempUser.username?.length ?? 0 }}/50</small>
                </div>
                <div class="my-4">
                    <label for="name" class="font-medium text-zinc-800">Name:</label>
                    <input
                        id="name"
                        v-model="tempUser.name"
                        type="text"
                        placeholder="Enter your name"
                        maxlength="50"
                        class="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    />
                    <small class="mt-1 block text-xs text-zinc-500">{{ tempUser.name?.length ?? 0 }}/50</small>
                </div>

                <div class="my-4">
                    <label for="email" class="font-medium text-zinc-800">Email:</label>
                    <input
                        id="email"
                        v-model="tempUser.email"
                        type="email"
                        placeholder="Enter your email"
                        maxlength="150"
                        class="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    />
                    <small class="mt-1 block text-xs text-zinc-500">{{ tempUser.email?.length ?? 0 }}/150</small>
                </div>
                <div class="my-4">
                    <label for="location" class="font-medium text-zinc-800">Location:</label>
                    <input
                        id="location"
                        v-model="tempUser.location"
                        type="text"
                        placeholder="Enter your location"
                        maxlength="255"
                        class="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    />
                    <small class="mt-1 block text-xs text-zinc-500">{{ tempUser.location?.length ?? 0 }}/255</small>
                </div>
                <div class="my-4">
                    <label for="bio" class="font-medium text-zinc-800">Bio:</label>
                    <textarea
                        id="bio"
                        v-model="tempUser.bio"
                        placeholder="Tell us about yourself"
                        maxlength="500"
                        class="mt-1.5 w-full resize-y rounded-md border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    />
                    <small class="mt-1 block text-xs text-zinc-500">{{ tempUser.bio?.length ?? 0 }}/500</small>
                </div>
            </div>

            <div class="flex justify-end gap-2.5">
                <button
                    type="button"
                    class="rounded-full border-0 bg-transparent px-6 py-3 text-base text-[#0870d1] transition hover:bg-blue-50"
                    @click="closeModal"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    class="rounded-full border-0 bg-[#0870d1] px-6 py-3 text-base font-bold text-white shadow-md transition hover:brightness-95"
                    @click="saveChanges"
                >
                    Save
                </button>
            </div>
        </div>

        <input ref="coverImageInput" type="file" accept="image/*" class="hidden" @change="onCoverImageChange" />
        <input ref="profileImageInput" type="file" accept="image/*" class="hidden" @change="onProfileImageChange" />
    </div>
</template>

<script>
import { notification } from 'ant-design-vue';
import { useUserStore } from '~/stores/userStore.js';
import { storeToRefs } from 'pinia';

export default {
    props: {
        isVisible: {
            type: Boolean,
            required: true,
        },
    },
    emits: ['close', 'update'],
    data() {
        const userStore = useUserStore();
        const { user } = storeToRefs(userStore);
        return {
            userStore,
            user,
            tempUser: { ...user.value },
            coverFile: null,
            profileFile: null,
        };
    },
    methods: {
        getFullImageUrl(imagePath, defaultImage) {
            if (!imagePath) {
                return `/images/${defaultImage}`;
            }
            if (imagePath.startsWith('blob:') || imagePath.startsWith('http')) {
                return imagePath;
            }
            return `${this.apiOrigin}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
        },

        closeModal() {
            this.$emit("close");
            this.$emit("update");
        },
        selectCoverImage() {
            this.$refs.coverImageInput.click();
        },
        selectProfileImage() {
            this.$refs.profileImageInput.click();
        },
        onCoverImageChange(event) {
            const file = event.target.files[0];
            if (file) {
                this.coverFile = file;
                this.tempUser.cover_photo = URL.createObjectURL(file);
            }
        },
        onProfileImageChange(event) {
            const file = event.target.files[0];
            if (file) {
                this.profileFile = file;
                this.tempUser.profile_picture = URL.createObjectURL(file);
            }
        },
        async saveChanges() {
            try {
                await this.userStore.updateUserProfile(this.tempUser, this.profileFile, this.coverFile);
                notification.success({
                    message: 'Success',
                    description: 'Profile updated successfully!',
                });
                this.closeModal();
            } catch (error) {
                if (error.response && error.response.status === 422) {
                    const errors = error.response.data.errors;
                    if (Array.isArray(errors)) {
                        notification.error({
                            message: 'Validation',
                            description: errors.join(', '),
                        });
                    } else if (errors && typeof errors === 'object') {
                        if (errors.username) {
                            notification.error({
                                message: 'Username Error',
                                description: errors.username[0],
                            });
                        }
                        if (errors.email) {
                            notification.error({
                                message: 'Email Error',
                                description: errors.email[0],
                            });
                        }
                    } else {
                        notification.error({
                            message: 'Error',
                            description: error.apiMessage || error.response?.data?.message || 'Validation failed.',
                        });
                    }
                } else {
                    notification.error({
                        message: 'Error',
                        description: error.apiMessage || error.response?.data?.message || 'Failed to update profile!',
                    });
                }
            }
        },
    },
    watch: {
        isVisible(newVal) {
            if (newVal) {
                this.userStore.fetchUserData();
                this.tempUser = { ...this.user };
            }
        }
    }
};
</script>
