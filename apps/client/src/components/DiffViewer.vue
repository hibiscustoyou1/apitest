<template>
  <div class="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1117]">
    <div v-if="!html" class="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
      Generating Diff...
    </div>
    <div v-else v-html="html" class="h-full overflow-auto p-4 text-sm font-mono shiki-container"></div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue';
  import { createTwoFilesPatch } from 'diff';
  import { createHighlighterCore } from 'shiki/core';
  import { createWasmOnigEngine } from 'shiki/engine/oniguruma';
  import { useDark } from '@vueuse/core';

  const props = defineProps<{
    oldString: string;
    newString: string;
    fileName?: string;
  }>();

  const html = ref('');
  const isDark = useDark();
  let highlighter: any = null;

  // 初始化 Shiki (Singleton 模式建议在全局做，这里为了组件独立性单独演示)
  const initShiki = async () => {
    if (highlighter) return;
    highlighter = await createHighlighterCore({
      themes: [
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/github-dark.mjs'),
      ],
      langs: [
        import('shiki/langs/diff.mjs'), // 引入 Diff 语法支持
      ],
      engine: createWasmOnigEngine(import('shiki/wasm'))
    });
  };

  const generateDiff = async () => {
    if (!props.oldString && !props.newString) {
      html.value = '';
      return;
    }

    await initShiki();

    // 1. 使用 JS 计算差异 (生成 Unified Diff 格式)
    const fileName = props.fileName || 'response.json';
    const patch = createTwoFilesPatch(
      fileName,
      fileName,
      props.oldString,
      props.newString,
      'Original',
      'New',
      { context: 3 } // 上下文保留3行
    );

    // 2. 使用 WASM (Shiki) 渲染 Diff 高亮
    html.value = highlighter.codeToHtml(patch, {
      lang: 'diff',
      theme: isDark.value ? 'github-dark' : 'github-light'
    });
  };

  watch([() => props.oldString, () => props.newString, isDark], generateDiff);
  onMounted(generateDiff);
</script>

<style>
  /* 针对 Diff 输出的特定样式微调 */
  .shiki-container .line span[style*="color:#b31d28"] { /* Red for delete in light mode */
    background-color: #ffebe9;
    display: inline-block;
    width: 100%;
  }
  .shiki-container .line span[style*="color:#22863a"] { /* Green for add in light mode */
    background-color: #dafbe1;
    display: inline-block;
    width: 100%;
  }
  /* 暗黑模式适配可根据 Shiki 主题自动处理，或在此处增强 */
</style>
