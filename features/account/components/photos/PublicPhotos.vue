<template>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        <div
            class="flex aspect-square flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-white p-4 text-center"
        >
            <i class="fa-solid fa-arrow-up mb-2 text-2xl text-gray-400" aria-hidden="true" />
            <p class="text-sm font-medium text-gray-900">Upload your photos</p>
            <button
                type="button"
                class="mt-3 rounded-full bg-[#0870d1] px-6 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-blue-700"
                @click="$emit('create-photo')"
            >
                Upload
            </button>
        </div>

        <div
            v-for="photo in photos"
            :key="photo.id"
            class="group flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm"
        >
            <div class="relative aspect-square w-full overflow-hidden bg-gray-100">
                <NuxtLink
                    v-if="photo.photo_token"
                    :to="{ name: 'PhotoDetail', params: { token: photo.photo_token } }"
                    class="block h-full w-full"
                >
                    <img
                        :src="photo.image_url"
                        :alt="photo.title"
                        class="h-full w-full object-cover transition duration-150 group-hover:opacity-95"
                    />
                </NuxtLink>
                <div v-else class="block h-full w-full">
                    <img
                        :src="photo.image_url"
                        :alt="photo.title"
                        class="h-full w-full object-cover opacity-80"
                    />
                </div>
                <button
                    type="button"
                    class="absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-black/5 transition hover:bg-gray-50"
                    :class="activeDropdown === 'dropdown-' + photo.id ? 'ring-2 ring-[#0870d1]' : ''"
                    aria-label="Photo actions"
                    @click.stop="$emit('toggle-dropdown', 'dropdown-' + photo.id)"
                >
                    <i class="fa-solid fa-ellipsis text-sm" />
                </button>
                <div
                    v-if="activeDropdown === 'dropdown-' + photo.id"
                    class="absolute bottom-11 right-2 z-[100] min-w-[200px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                    @click.stop
                >
                    <ul class="m-0 list-none p-0">
                        <li
                            class="cursor-pointer px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                            @click="$emit('edit-photo', photo.id)"
                        >
                            <i class="fa-solid fa-pencil mr-2 w-4 text-gray-500" /> Edit
                        </li>
                        <li
                            class="cursor-pointer px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                            @click="$emit('add-gallery', photo.id)"
                        >
                            <i class="fa-solid fa-plus mr-2 w-4 text-gray-500" /> Add to Gallery
                        </li>
                        <li
                            class="cursor-pointer px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                            @click="downloadImage(photo.image_url, photo.title)"
                        >
                            <i class="fa-solid fa-download mr-2 w-4 text-gray-500" /> Download
                        </li>
                        <li
                            class="cursor-pointer px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            @click="$emit('delete-photo', photo)"
                        >
                            <i class="fa-solid fa-trash-can mr-2 w-4" /> Remove
                        </li>
                    </ul>
                </div>
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-gray-100 bg-white px-3 py-2.5">
                <h4 class="min-w-0 flex-1 truncate text-xs font-semibold text-gray-900">
                    {{ truncateTitle(photo.title, 36) }}
                </h4>
                <span class="shrink-0 text-xs font-normal text-gray-500">
                    {{ photo.privacy_status == 0 || photo.privacy_status === '0' ? 'Public' : 'Private' }}
                </span>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'PublicPhotos',
    props: {
        photos: {
            type: Array,
            required: true
        },
        activeDropdown: {
            type: String,
            default: null
        },
        downloadImage: {
            type: Function,
            required: true
        }
    },
    emits: ['create-photo', 'edit-photo', 'add-gallery', 'delete-photo', 'toggle-dropdown'],
    methods: {
        truncateTitle(title, maxLength = 36) {
            if (!title) {
                return 'Untitled';
            }
            if (title.length > maxLength) {
                return title.substring(0, maxLength) + '…';
            }
            return title;
        }
    }
};
</script>
