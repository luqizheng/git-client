<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium">{{ t('sshKeys.title') }}</h3>
      <div class="flex gap-2">
        <Button @click="showGenerator = true">
          <PlusIcon class="w-4 h-4 mr-1" />
          {{ t('sshKeys.generate') }}
        </Button>
        <Button variant="outline" @click="showImporter = true">
          <UploadIcon class="w-4 h-4 mr-1" />
          {{ t('sshKeys.import') }}
        </Button>
      </div>
    </div>

    <ssh-key-list :keys="keys" @refresh="loadKeys" />

    <ssh-key-generator v-model="showGenerator" @success="loadKeys" />
    <ssh-key-import v-model="showImporter" @success="loadKeys" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { Add as PlusIcon, CloudUpload as UploadIcon } from '@vicons/ionicons5';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import SshKeyList from './SshKeyList.vue';
import SshKeyGenerator from './SshKeyGenerator.vue';
import SshKeyImport from './SshKeyImport.vue';
import type { SshKey } from '../../types/key';
import { sshKeyApi } from '../../utils/keys';

const { t } = useI18n();

const keys = ref<SshKey[]>([]);
const showGenerator = ref(false);
const showImporter = ref(false);

async function loadKeys() {
  try {
    keys.value = await sshKeyApi.list();
  } catch (e) {
    toast.error(` if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' } : ${e}`);
  }
}

onMounted(() => {
  loadKeys();
});
</script>
