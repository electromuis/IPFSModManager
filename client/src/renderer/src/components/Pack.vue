<template>
    <div class="ml-5 mb-5">
      Name: {{ pack.name }}<br/>
      Banner: <img :src="bannerUrl" class="max-h-10 max-w-20" /><br/>
      Mod ID: {{ pack._id }}<br/>
      CID: {{ pack.cid }}<br/>
      Author: {{ pack.author }}<br/>
      Created at: {{ pack.createdAt }}<br/>
      Sources: {{ pack.sources.join(', ') }} <br/><br/>
      Source map: <br/>
      <ul>
        <li v-for="s in pack.sourceMap" class="ml-5 mb-5">
          <input type="checkbox" :disabled="this.working[s.name]" v-model="s.installed" @click="toggleSource(s.name)" /> {{ s.name }}
          <!-- {{ s.name }}: {{ s.installed ? 'Yes' : 'No' }} -->
        </li>
      </ul>
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

    async created() {
      console.log('Pack: ', this.pack)

    },

    data() {
      return {
        working: {}
      }
    },

    methods: {
      async toggleSource(sourceName) {
        console.log('toggling', this.pack, sourceName)
        this.working[sourceName] = true
        const sourceEntry = this.pack.sourceMap.find(s => s.name === sourceName)

        if(sourceEntry.installed) {
          await api.uninstallPack(JSON.parse(JSON.stringify(this.pack)), sourceName)
        } else {
          await api.installPack(JSON.parse(JSON.stringify(this.pack)), sourceName)
        }

        this.working[sourceName] = false
      }
    }
}
</script>
