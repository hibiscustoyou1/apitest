<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">
        Diff Viewer
      </div>
      <div class="flex items-center space-x-2">
        <label class="flex items-center cursor-pointer relative">
          <input type="checkbox" v-model="isSemanticMode" class="sr-only peer">
          <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
          <span class="ml-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            Semantic JSON (Ignore Order)
          </span>
        </label>
      </div>
    </div>

    <div class="flex-1 relative overflow-hidden bg-white dark:bg-[#0d1117]">
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center text-slate-400 text-sm z-10 bg-white/80 dark:bg-black/50">
        Computing {{ isSemanticMode ? 'Semantic ' : '' }}Diff...
      </div>

      <div v-else-if="!diffHtml" class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm">
        <span class="mb-2 text-2xl">✨</span>
        <span>No differences found</span>
        <span v-if="isSemanticMode" class="text-xs opacity-60 mt-1">(JSON structure is identical)</span>
      </div>

      <div v-else v-html="diffHtml" class="h-full overflow-auto p-4 text-sm font-mono shiki-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue';
  import { createHighlighterCore } from 'shiki/core';
  import { createWasmOnigEngine } from 'shiki/engine/oniguruma';
  import { useDark } from '@vueuse/core';
  // 导入新的 WASM 函数
  import init, { compute_diff, compute_semantic_diff } from '@repo/wasm';

  const props = defineProps<{
    oldString: string;
    newString: string;
  }>();

  const diffHtml = ref('');
  const isLoading = ref(false);
  const isSemanticMode = ref(true); // 默认开启语义化对比，体验更好
  const isDark = useDark();
  let highlighter: any = null;
  let isWasmReady = false;

  // ... (initResources 代码保持不变) ...
  const initResources = async () => {
    if (!isWasmReady) { await init(); isWasmReady = true; }
    if (!highlighter) {
      highlighter = await createHighlighterCore({
        themes: [ import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs') ],
        langs: [ import('shiki/langs/diff.mjs') ],
        engine: createWasmOnigEngine(import('shiki/wasm'))
      });
    }
  };

  const generateDiff = async () => {
    // 如果两个字符串完全相等（字符串级），直接返回空
    if (props.oldString === props.newString) {
      diffHtml.value = '';
      return;
    }

    isLoading.value = true;
    try {
      await initResources();

      // 根据模式选择不同的 WASM 计算函数
      let diffString = '';
      if (isSemanticMode.value) {
        diffString = compute_semantic_diff(props.oldString, props.newString);
      } else {
        diffString = compute_diff(props.oldString, props.newString);
      }

      if (!diffString.trim()) {
        diffHtml.value = '';
      } else {
        diffHtml.value = highlighter.codeToHtml(diffString, {
          lang: 'diff',
          theme: isDark.value ? 'github-dark' : 'github-light'
        });
      }
    } catch (e) {
      console.error("WASM Diff failed:", e);
      diffHtml.value = `<div class="text-red-500 p-4">Diff Error: ${e}</div>`;
    } finally {
      isLoading.value = false;
    }
  };

  // 监听模式切换，重新计算
  watch([() => props.oldString, () => props.newString, isDark, isSemanticMode], generateDiff);
  onMounted(generateDiff);
</script>

<style>
  /* 确保 Toggle 开关样式正确 */
  /* Diff 颜色样式保持不变 */
  .shiki-container .line span[style*="color:#b31d28"] { background-color: #ffebe9; display: inline-block; width: 100%; }
  .shiki-container .line span[style*="color:#22863a"] { background-color: #dafbe1; display: inline-block; width: 100%; }
  html.dark .shiki-container .line span[style*="color:#b31d28"] { background-color: #442c2d; }
  html.dark .shiki-container .line span[style*="color:#22863a"] { background-color: #2b3b2c; }
</style>
