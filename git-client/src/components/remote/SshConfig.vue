<template>
  <div class="p-2 text-xs">
    <div class="text-gray-400 mb-1">SSH Key Configuration</div>
    <n-form>
      <n-form-item label="SSH Key Path">
        <n-input v-model:value="sshKeyPath" placeholder="~/.ssh/id_ed25519" />
      </n-form-item>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NForm, NFormItem, NInput } from 'naive-ui'

const sshKeyPath = ref('')
</script>
