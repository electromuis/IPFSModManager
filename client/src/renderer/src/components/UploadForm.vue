<template>
  <div>
    <button @click="selectFolder">Select mod</button>
    <input v-model="folder" placeholder="Folder" /><br/>
    <input v-model="mod.image" placeholder="Image" /><br/>
    <input v-model="mod.name" placeholder="Name" /><br/>
    <input v-model="mod.path" placeholder="Path" /><br/>
    <input v-model="mod.website" placeholder="Website" /><br/>
    <input v-model="mod.version" type="num" placeholder="Version" /><br/>
    <input v-model="mod.createdAt" type="date" placeholder="Created At" /><br/>
    <button @click="uploadPack">Upload</button><br/>
    <!-- Progress: {{ progress }} % -->

  </div>
</template>

<script>
export default {
  methods: {
    async selectFolder() {
      console.log('selecting folder')
      const result = await api.selectFolder()
      this.mod = result.mod
      this.folder = result.folder
      console.log('selected folder', this.mod, this.folder)
    },
    uploadPack() {
      console.log('uploading pack', this.mod)
      api.uploadPack(this.folder, JSON.parse(JSON.stringify(this.mod)))
    },
    created() {
      const me = this
      electron.ipcRenderer.on('upload-progress', (event, progress) => {
        console.log('upload progress', progress)
        me.progress = math.round(progress * 100)
      })
    }
  },
  data() {
    return {
      folder: "",
      mod: {
        name: "",
        path: "",
        image: "",
        website: "",
        version: 1,
        createdAt: new Date()
      },
      progress: 0
    }
  },
  created() {

  }
}
</script>
