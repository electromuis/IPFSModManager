<template>
    <div class="flex h-32 gap-x-5 m-y-2">
        <img class="h-full" :src="bannerUrl" />

        <div class="grow">
            <h1 class="text-3xl font-bold mb-4">{{pack.name}}</h1>

            <div class="flex">
                <div class="flex-auto">
                    <span class="font-bold text-blue">{{pack.author ?? 'Unknown'}}</span><br/>
                    <span class="text-grey">Release: {{pack.createdAt}}</span><br/>
                    <span class="text-grey">Last update: {{pack.updatedAt}}</span><br/>
                </div>
                <div class="flex-auto">
                    <!-- {{pack.meta.tags}} -->
                </div>
            </div>
        </div>
        <div class="flex flex-col w-48 gap-y-3">
            <button v-if="!pack.sources.includes('installed')" class="bg-blue text-lightblue button" @click="install">
                Install
            </button>
            <button v-else class="bg-grey text-lightblue button" @click="uninstall">
                Uninstall
            </button>
            <a v-if="pack.website" :href="pack.website" class="border-grey border-2 text-grey button" >
                Website
            </a>

            Sources: {{ pack.sources.join(', ') }}

        </div>
    </div>
</template>

<script>
// import config from '../modules/config.mjs'

export default {
    props: ['pack'],

    computed: {
        packUrl() {
            return '/api/v0/get?arg=' + this.pack.repo + '/' + encodeURIComponent(this.pack.name)
        },
        bannerUrl() {
            if(!this.pack.image) {
                return ''
            }

            const gateway = 'http://localhost:8080/ipfs/'
            return gateway + this.pack.cid + '/' + this.pack.image
        }
    },

    data() {
      return {

      }
    },

    methods: {
      install() {
        console.log('installing', this.pack)
        api.installPack(JSON.parse(JSON.stringify(this.pack)))
      },
      uninstall() {
        console.log('uninstalling', this.pack)
        api.uninstallPack(JSON.parse(JSON.stringify(this.pack)))
      }
    }
}
</script>
