<template>
  <div class="commit-editor-section">
    <input
      class="summary-input"
      :value="summary"
      placeholder="Summary (required)"
      @input="$emit('update:summary', ($event.target as HTMLInputElement).value)"
    />
    <textarea
      class="description-input"
      :value="description"
      placeholder="Description"
      rows="3"
      @input="$emit('update:description', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="commit-actions">
      <button
        class="commit-btn"
        :disabled="!canCommit"
        @click="$emit('commit')"
      >Commit</button>
      <label class="amend-label">
        <input
          type="checkbox"
          :checked="amend"
          @change="$emit('update:amend', ($event.target as HTMLInputElement).checked)"
        />
        <span>Amend</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  summary: string
  description: string
  amend: boolean
  hasStagedFiles: boolean
}>()

defineEmits<{
  commit: []
  'update:summary': [value: string]
  'update:description': [value: string]
  'update:amend': [value: boolean]
}>()

const canCommit = computed(() => props.summary.trim().length > 0 && props.hasStagedFiles)
</script>

<style scoped>
.commit-editor-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.summary-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  outline: none;
  box-sizing: border-box;
}

.summary-input:focus {
  border-color: var(--accent-blue);
}

.summary-input::placeholder {
  color: var(--text-muted);
}

.description-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  outline: none;
  resize: vertical;
  min-height: 48px;
  max-height: 120px;
  box-sizing: border-box;
  font-family: inherit;
  line-height: 1.4;
}

.description-input:focus {
  border-color: var(--accent-blue);
}

.description-input::placeholder {
  color: var(--text-muted);
}

.commit-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.commit-btn {
  height: 26px;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  background: #0e639c;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}

.commit-btn:hover:not(:disabled) {
  background: #1177bb;
}

.commit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.amend-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.amend-label input {
  margin: 0;
  cursor: pointer;
}
</style>
