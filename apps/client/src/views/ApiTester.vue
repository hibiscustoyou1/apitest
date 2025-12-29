<template>
  <div class="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
    <aside class="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950">
      <div class="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <h1 class="font-bold text-lg tracking-tight">API Tester</h1>
        <ThemeToggle />
      </div>
      <div class="flex-1 p-4 overflow-y-auto">
        <div class="text-xs font-medium text-slate-400 uppercase mb-2">History</div>
        <div class="space-y-1">
          <div class="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm truncate opacity-60">
            暂无历史记录
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col h-full overflow-hidden">
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
        <div class="flex gap-2">
          <select
            v-model="method"
            class="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded border-none font-medium focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <input
            v-model="url"
            type="text"
            placeholder="Enter request URL (e.g., https://jsonplaceholder.typicode.com/todos/1)"
            class="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded border-none focus:ring-2 focus:ring-primary-500 outline-none"
            @keyup.enter="sendRequest"
          />
          <button
            @click="sendRequest"
            :disabled="isLoading"
            class="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <span v-if="isLoading" class="mr-2 animate-spin">⟳</span>
            {{ isLoading ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <div class="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
          <h2 class="text-xs font-bold text-slate-500 uppercase mb-2">Request Body (JSON)</h2>
          <textarea
            v-model="requestBody"
            class="flex-1 w-full p-3 font-mono text-sm bg-slate-100 dark:bg-slate-800 rounded border-none resize-none focus:ring-1 focus:ring-primary-500 outline-none"
            placeholder='{ "key": "value" }'
          ></textarea>
        </div>

        <div class="flex-1 flex flex-col p-4 bg-slate-50 dark:bg-slate-900 overflow-y-auto relative">
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-xs font-bold text-slate-500 uppercase">Response</h2>
            <div v-if="responseMeta" class="flex gap-3 text-xs">
              <span :class="statusColorClass">{{ responseMeta.status }} {{ responseMeta.statusText }}</span>
              <span class="text-slate-400">{{ responseMeta.timeTaken }}ms</span>
            </div>
          </div>

          <div class="flex-1 relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1117]">
            <div v-if="!responseHtml" class="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Ready to send request
            </div>
            <div v-else v-html="responseHtml" class="h-full overflow-auto p-4 text-sm font-mono shiki-container"></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  import { useDark } from '@vueuse/core';
  import api from '@/api';
  import ThemeToggle from '@/components/ThemeToggle.vue';
  import { createHighlighterCore } from 'shiki/core';
  import { createOnigScanner, createWasmOnigEngine } from 'shiki/engine/oniguruma';
  import getWasm from 'shiki/wasm';

  // Types
  import type { HttpMethod, ProxyResponseDto, ApiResponse } from '@repo/shared';

  // State
  const method = ref<HttpMethod>('GET');
  const url = ref('');
  const requestBody = ref('');
  const isLoading = ref(false);
  const responseMeta = ref<ProxyResponseDto | null>(null);
  const responseHtml = ref('');

  // Shiki Highlighter State
  const isDark = useDark();
  let highlighter: any = null;

  // Initialize Shiki (WASM)
  const initShiki = async () => {
    highlighter = await createHighlighterCore({
      themes: [
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/github-dark.mjs'),
      ],
      langs: [
        import('shiki/langs/json.mjs'),
        import('shiki/langs/html.mjs'),
      ],
      engine: createWasmOnigEngine(import('shiki/wasm'))
    });
  };

  const highlightCode = async (code: string, lang = 'json') => {
    if (!highlighter) await initShiki();
    return highlighter.codeToHtml(code, {
      lang,
      theme: isDark.value ? 'github-dark' : 'github-light'
    });
  };

  // Actions
  const sendRequest = async () => {
    if (!url.value) return;
    isLoading.value = true;
    responseHtml.value = '';
    responseMeta.value = null;

    try {
      let parsedBody = undefined;
      if (requestBody.value && ['POST', 'PUT', 'PATCH'].includes(method.value)) {
        try {
          parsedBody = JSON.parse(requestBody.value);
        } catch (e) {
          alert('Invalid JSON in Request Body');
          isLoading.value = false;
          return;
        }
      }

      const res = await api.post<ApiResponse<ProxyResponseDto>>('/proxy', {
        method: method.value,
        url: url.value,
        body: parsedBody
      });

      if (res.data.code === 200 && res.data.data) {
        const data = res.data.data;
        responseMeta.value = data;
        const formattedJson = JSON.stringify(data.data, null, 2);
        responseHtml.value = await highlightCode(formattedJson, 'json');
      } else {
        responseHtml.value = await highlightCode(JSON.stringify(res.data, null, 2), 'json');
      }

    } catch (error: any) {
      console.error(error);
      responseHtml.value = `<div class="text-red-500 p-4">Error: ${error.message}</div>`;
    } finally {
      isLoading.value = false;
    }
  };

  const statusColorClass = computed(() => {
    const status = responseMeta.value?.status || 0;
    if (status >= 200 && status < 300) return 'text-green-500 font-bold';
    if (status >= 400) return 'text-red-500 font-bold';
    return 'text-yellow-500';
  });

  // Re-highlight when theme changes
  watch(isDark, async () => {
    if (responseMeta.value?.data) {
      const json = JSON.stringify(responseMeta.value.data, null, 2);
      responseHtml.value = await highlightCode(json, 'json');
    }
  });

  initShiki();
</script>

<style>
  /* Shiki Background Override to match container */
  .shiki-container pre.shiki {
    background-color: transparent !important;
    margin: 0;
    font-family: 'Fira Code', monospace;
  }
</style>
