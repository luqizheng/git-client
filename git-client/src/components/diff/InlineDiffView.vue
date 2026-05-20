<script setup lang="ts">
const props = defineProps<{
  oldContent: string;
  newContent: string;
  hunks: Hunk[];
}>();

interface Hunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: DiffLine[];
}

type DiffLine = { Context: string } | { Addition: string } | { Deletion: string };

function getLineType(line: DiffLine): 'context' | 'addition' | 'deletion' {
  if ('Addition' in line) return 'addition';
  if ('Deletion' in line) return 'deletion';
  return 'context';
}

function getLineContent(line: DiffLine): string {
  if ('Addition' in line) return line.Addition;
  if ('Deletion' in line) return line.Deletion;
  return line.Context;
}
</script>

<template>
  <div class="h-full overflow-auto font-mono text-sm">
    <div v-if="hunks.length > 0">
      <div v-for="(hunk, hunkIndex) in hunks" :key="hunkIndex" class="border-b border-border">
        <div class="px-3 py-1 bg-muted text-xs text-muted-foreground border-b border-border">
          @@ -{{ hunk.old_start }},{{ hunk.old_lines }} +{{ hunk.new_start }},{{ hunk.new_lines }} @@
        </div>
        <div class="leading-6">
          <div
            v-for="(line, lineIndex) in hunk.lines"
            :key="lineIndex"
            class="flex"
            :class="{
              'bg-accent-green/10': getLineType(line) === 'addition',
              'bg-destructive/10': getLineType(line) === 'deletion',
              'hover:bg-muted/50': getLineType(line) === 'context',
            }"
          >
            <span class="w-12 px-2 text-right text-muted-foreground select-none border-r border-border bg-muted/30">
              {{ getLineType(line) === 'deletion' ? hunk.old_start + lineIndex : '' }}
            </span>
            <span class="w-12 px-2 text-right text-muted-foreground select-none border-r border-border bg-muted/30">
              {{ getLineType(line) === 'addition' ? hunk.new_start + lineIndex : '' }}
            </span>
            <span class="w-6 px-1 text-center select-none" :class="{
              'text-accent-green': getLineType(line) === 'addition',
              'text-destructive': getLineType(line) === 'deletion',
              'text-muted-foreground': getLineType(line) === 'context',
            }">
              {{ getLineType(line) === 'addition' ? '+' : getLineType(line) === 'deletion' ? '-' : ' ' }}
            </span>
            <span class="flex-1 px-2 whitespace-pre">{{ getLineContent(line) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="p-4">
      <div class="flex border-b border-border">
        <div class="flex-1 p-2 bg-muted/50">
          <div class="text-xs text-muted-foreground mb-1">Original</div>
          <pre class="text-sm whitespace-pre-wrap">{{ oldContent }}</pre>
        </div>
        <div class="w-px bg-border" />
        <div class="flex-1 p-2">
          <div class="text-xs text-muted-foreground mb-1">Modified</div>
          <pre class="text-sm whitespace-pre-wrap">{{ newContent }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
