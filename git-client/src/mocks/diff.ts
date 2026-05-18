import type { FileDiff, FileContent } from '../types/git'

interface MockFileContent {
  old_content: string
  new_content: string
}

const FILE_CONTENTS: Record<string, MockFileContent> = {
  'src/App.vue': {
    old_content: `<template>
  <div id="app">
    <h1>Hello World</h1>
  </div>
</template>

<script setup>
</script>`,
    new_content: `<template>
  <div id="app">
    <h1>Welcome to My App</h1>
    <p>This is the new version</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const message = ref('Hello')
</script>`,
  },
  'src/components/Hello.vue': {
    old_content: `<template>
  <div class="hello">
    <h2>Hello Component</h2>
  </div>
</template>

<script setup>
</script>

<style scoped>
.hello {
  color: red;
}
</style>`,
    new_content: `<template>
  <div class="hello">
    <h2>Hello Component</h2>
    <p>Updated version</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.hello {
  color: blue;
}
</style>`,
  },
  'README.md': {
    old_content: `# My Project

This is a simple project.

## Features

- Feature A
- Feature B`,
    new_content: `# My Project

This is a simple project with new features.

## Features

- Feature A
- Feature B
- Feature C
- Feature D`,
  },
  'package.json': {
    old_content: `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "vue": "^3.0.0"
  }
}`,
    new_content: `{
  "name": "my-app",
  "version": "1.1.0",
  "dependencies": {
    "vue": "^3.5.0",
    "pinia": "^3.0.0"
  }
}`,
  },
  'src/utils/helper.ts': {
    old_content: `export function add(a: number, b: number): number {
  return a + b
}

export function multiply(a: number, b: number): number {
  return a * b
}`,
    new_content: `export function add(a: number, b: number): number {
  return a + b
}

export function multiply(a: number, b: number): number {
  return a * b
}

export function subtract(a: number, b: number): number {
  return a - b
}`,
  },
}

export const MOCK_FILE_DIFFS: FileDiff[] = [
  {
    path: 'src/App.vue',
    old_path: 'src/App.vue',
    status: 'Modified',
    hunks: [
      {
        old_start: 1,
        old_lines: 6,
        new_start: 1,
        new_lines: 8,
        lines: [
          { Context: '<template>' },
          { Context: '  <div id="app">' },
          { Context: '    <h1>Hello World</h1>' },
          { Addition: '    <p>This is the new version</p>' },
          { Deletion: '  </div>' },
          { Context: '</template>' },
          { Context: '' },
          { Context: '<script setup>' },
          { Addition: "import { ref } from 'vue'" },
          { Addition: "const message = ref('Hello')" },
          { Context: '</script>' },
        ],
      },
    ],
  },
  {
    path: 'src/components/Hello.vue',
    old_path: 'src/components/Hello.vue',
    status: 'Modified',
    hunks: [
      {
        old_start: 1,
        old_lines: 12,
        new_start: 1,
        new_lines: 15,
        lines: [
          { Context: '<template>' },
          { Context: '  <div class="hello">' },
          { Context: '    <h2>Hello Component</h2>' },
          { Addition: '    <p>Updated version</p>' },
          { Context: '  </div>' },
          { Context: '</template>' },
          { Context: '' },
          { Context: '<script setup>' },
          { Addition: "import { ref } from 'vue'" },
          { Addition: 'const count = ref(0)' },
          { Deletion: '</script>' },
          { Context: '</script>' },
          { Context: '' },
          { Context: '<style scoped>' },
          { Addition: '.hello {' },
          { Deletion: '.hello {' },
          { Addition: '  color: blue;' },
          { Deletion: '  color: red;' },
          { Context: '}' },
          { Context: '</style>' },
        ],
      },
    ],
  },
  {
    path: 'README.md',
    old_path: 'README.md',
    status: 'Modified',
    hunks: [
      {
        old_start: 1,
        old_lines: 6,
        new_start: 1,
        new_lines: 8,
        lines: [
          { Context: '# My Project' },
          { Context: '' },
          { Context: 'This is a simple project.' },
          { Addition: 'with new features.' },
          { Context: '' },
          { Context: '## Features' },
          { Addition: '- Feature C' },
          { Addition: '- Feature D' },
          { Context: '' },
        ],
      },
    ],
  },
  {
    path: 'package.json',
    old_path: 'package.json',
    status: 'Modified',
    hunks: [
      {
        old_start: 1,
        old_lines: 5,
        new_start: 1,
        new_lines: 6,
        lines: [
          { Context: '{' },
          { Context: '  "name": "my-app",' },
          { Deletion: '  "version": "1.0.0",' },
          { Addition: '  "version": "1.1.0",' },
          { Context: '  "dependencies": {' },
          { Deletion: '    "vue": "^3.0.0"' },
          { Addition: '    "vue": "^3.5.0",' },
          { Addition: '    "pinia": "^3.0.0"' },
          { Context: '  }' },
          { Context: '}' },
        ],
      },
    ],
  },
  {
    path: 'src/utils/helper.ts',
    old_path: 'src/utils/helper.ts',
    status: 'Modified',
    hunks: [
      {
        old_start: 5,
        old_lines: 3,
        new_start: 5,
        new_lines: 6,
        lines: [
          { Context: '  return a * b' },
          { Context: '}' },
          { Context: '' },
          { Addition: 'export function subtract(a: number, b: number): number {' },
          { Addition: '  return a - b' },
          { Addition: '}' },
        ],
      },
    ],
  },
  {
    path: 'src/new-file.ts',
    old_path: null,
    status: 'Added',
    hunks: [
      {
        old_start: 0,
        old_lines: 0,
        new_start: 1,
        new_lines: 5,
        lines: [
          { Addition: '// This is a new file' },
          { Addition: '' },
          { Addition: 'export function newFunction() {' },
          { Addition: '  console.log("Hello from new file")' },
          { Addition: '}' },
        ],
      },
    ],
  },
]

export function getMockFileContent(filePath: string, commitId: string): FileContent | null {
  const content = FILE_CONTENTS[filePath]
  if (!content) {
    return {
      old_content: `// Content for ${filePath}\n// Commit: ${commitId}\n`,
      new_content: `// Content for ${filePath}\n// Commit: ${commitId}\n// Modified version\n`,
      old_path: filePath,
      new_path: filePath,
      hunks: [],
    }
  }

  const fileDiff = MOCK_FILE_DIFFS.find(f => f.path === filePath)
  return {
    old_content: content.old_content,
    new_content: content.new_content,
    old_path: filePath,
    new_path: filePath,
    hunks: fileDiff?.hunks ?? [],
  }
}
