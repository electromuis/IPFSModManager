<template>
    <div class="flex tags gap-x-4 mt-2">
        <div class="tag" v-for="t in tags">
            {{t}} <span class="font-bold ml-2 cursor-pointer" @click="removeTag(t)">X</span>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            tags: ['2022', 'Interesting']
        }
    },

    methods: {
        removeTag(tag) {
            this.tags = this.tags.filter(function(t) {
                return t !== tag
            })
        }
    }
}
</script>