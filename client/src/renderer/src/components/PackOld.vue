<template>
  <div>
    Name: {{ pack.name }} <br/>
    CID: {{ pack.cid }} <br/>
    ID: {{ pack._id }} <br/>
    Path: |{{ pack.path }}| <br/>
    Sources: {{ pack.sources.join(', ') }} <br/>
    <button v-if="!pack.sources.includes('installed')" @click="install">Install</button>
  </div>
</template>

<script lang="ts">
export default {
  props: {
    pack: Object
  },

  methods: {
    install() {
      console.log('installing', this.pack)
      api.installPack(JSON.parse(JSON.stringify(this.pack)))
    }
  }
}
</script>
