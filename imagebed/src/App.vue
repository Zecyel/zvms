<!-- eslint-disable vue/no-v-text-v-html-on-component -->
<template>
  <v-layout>
    <v-app-bar image="favicon.ico" title="镇海中学义工管理系统 校外图片上传" />
    <v-main style="padding-left: 50px; padding-top: 150px">
      <v-form>
        <v-file-input
          label="点击选择图片，支持拖入，支持多张"
          show-size
          chips
          multiple
          clearable
          accept="image/*"
          v-model="files"
        />
        <v-btn @click="submit">开始上传</v-btn>
        <v-sheet v-html="msg" />
      </v-form>
      <v-dialog v-model="showPopup">
        <v-card>
          <v-card-title> 图片上传成功 </v-card-title>
          <v-card-text>
            图片上传成功，图片ID为：
            <p style="font-size: x-large">{{ shortKey }}</p>
            请记录在平板或其他任何地方。
            <br />
            在校内访问义工管理平台即可通过输入这个ID上传感想图片哦。
            <br />
            PS: 不能保证一周之后图片仍然保留。请在一周之内上传至平台。
          </v-card-text>
          <v-card-actions>
            <v-btn @click="closePop">确定</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-main>
  </v-layout>
</template>

<script lang="ts">
const keyTableApiUrl =
  'https://gitee.com/api/v5/repos/zvms/zvms-imagebed/issues/comments/17281159?access_token=bce04e8d78a6e8e5fa514aa96d79d417'
type KeyTable = [short: string, remoteUrl: string][]
import axios from 'axios'
import CryptoJS from 'crypto-js'
export default {
  name: 'image-bed-main',
  data() {
    return {
      files: [] as File[],
      msg: '请上传图片',
      showPopup: false,
      shortKey: '请上传图片'
    }
  },
  methods: {
    async fileMD5(file: File) {
      return CryptoJS.MD5(this.ArrayBufferToWordArray(await file.arrayBuffer())).toString()
    },
    async submit() {
      try {
        if (this.files.length === 0) {
          this.msg = '不能为空，请先在上方输入框上传图片'
          return
        }
        if (this.msg === '请上传图片') {
          this.msg = '开始上传...<br/>'
        } else {
          this.msg += '开始上传...<br/>'
        }
        const remoteUrls = [] as string[]
        for (const file of this.files) {
          this.msg += `开始上传${file.name}...<br/>`
          const remoteUrl = await this.uploadImage(file)

          remoteUrls.push(remoteUrl)
          this.msg += `&emsp;&emsp;&emsp;&emsp;> 上传至图床成功<br/>`
        }
        this.msg += `正在生成ID<br/>`
        const shortKey = await this.updateKeyTable(remoteUrls)
        this.shortKey = shortKey
        this.msg += `ID生成成功：${shortKey}<br/><BR/>`
        this.showPopup = true
      } catch (Error) {
        this.msg = '上传失败!!!'
      }
    },
    async uploadImage(file: File) {
      const formData = new FormData()
      formData.append('files', file)
      const response = await axios.post(
        'https://filesoss.yunzuoye.net/XHFileServer/file/upload/CA107011/',
        formData,
        {
          headers: {
            'XueHai-MD5': await this.fileMD5(file)
          }
        }
      )
      return response.data['uploadFileDTO']['fileId']
    },
    async updateKeyTable(remoteUrls: string[]) {
      const table = await this.fetchTable()
      const lastShortKey = table[table.length - 1][0]
      const shortKey = (parseInt(lastShortKey, 36) + (Math.random() * 400 + 100)).toString(36)
      for (const remoteUrl of remoteUrls) {
        table.push([shortKey, remoteUrl])
      }
      await this.uploadTable(table)
      return shortKey
    },
    async fetchTable(): Promise<KeyTable> {
      const response = await axios.get(keyTableApiUrl)
      const text = response.data.body as string
      const table = text
        .split('\n')
        .map((s) => s.split('='))
        .map((ss) => [ss[0].trim(), ss[1].trim()] as [string, string])
      return table
    },
    async uploadTable(table: KeyTable) {
      const response = await axios.patch(keyTableApiUrl, {
        body: table.map((v) => `${v[0]} = ${v[1]}`).join('\n')
      })
    },
    closePop() {
      this.files = []
      //this.msg= '请上传图片';
      this.shortKey = ''
      this.showPopup = false
    },
    ArrayBufferToWordArray(arrayBuffer: ArrayBuffer | Uint8Array) {
      let u8: Uint8Array
      if (arrayBuffer instanceof ArrayBuffer)
        u8 = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength)
      else u8 = arrayBuffer
      const len = u8.length
      const words: any[] = []
      for (let i = 0; i < len; i += 1) {
        words[i >>> 2] |= (u8[i] & 0xff) << (24 - (i % 4) * 8)
      }
      return CryptoJS.lib.WordArray.create(words, len)
    }
  }
}
</script>
