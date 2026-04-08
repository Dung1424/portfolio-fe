<template>
    <GalleryAccountGrid
        :galleries="galleries"
        :active-dropdown="activeDropdown"
        @create-gallery="$emit('create-gallery')"
        @go-to-gallery-details="$emit('go-to-gallery-details', $event)"
        @toggle-dropdown="$emit('toggle-dropdown', $event)"
        @edit-gallery="$emit('edit-gallery', $event)"
        @delete-gallery="$emit('delete-gallery', $event)"
    />
</template>

<script>
import GalleryAccountGrid from './GalleryAccountGrid.vue'

export default {
    name: 'AllGalleries',
    components: { GalleryAccountGrid },
    emits: [
        'create-gallery',
        'go-to-gallery-details',
        'toggle-dropdown',
        'edit-gallery',
        'delete-gallery',
    ],
    props: {
        galleries: {
            type: Array,
            required: true,
        },
        activeDropdown: {
            type: String,
            default: null,
        },
    },
};
</script>
