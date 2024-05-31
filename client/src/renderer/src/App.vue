<template>
  <LayoutMain>
    <UploadForm></UploadForm>
    <div class="packlist">
      <Pack v-for="pack in packList" :key="pack._id" :pack="pack"></Pack>
    </div>
  </LayoutMain>
</template>

<script lang="ts">
import LayoutMain from './LayoutMain.vue'
import Pack from './components/Pack.vue'
import UploadForm from './components/UploadForm.vue'

export default {
  components: {
    Pack,
    UploadForm,
    LayoutMain
  },
  computed: {
    packList() {
      return this.packs.sort((a, b) => {
        if (a.name < b.name) {
          return -1
        }
        if (a.name > b.name) {
          return 1
        }
        return 0
      })
    }
  },
  async created() {
    this.packs = await api.getPacks()

    const me = this
    window.ipcRenderer.on('pack-update', async () => {
      console.log('Pack update 2')
      me.packs = await api.getPacks()
    })
  },
  data() {
    return {
      packs: []
    }
  }
}
</script>

<style lang="scss">
  // .pack-list {
  //   display: flex;
  //   flex-wrap: wrap;
  //   justify-content: space-around;
  //   flex-direction: column;
  // }
</style>
