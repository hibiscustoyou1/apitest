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
          <div
            v-for="(item, idx) in history"
            :key="idx"
            @click="restoreHistory(item)"
            class="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm truncate flex justify-between group"
          >
            <span class="font-mono text-xs" :class="methodColor(item.method)">{{ item.method }}</span>
            <span class="truncate ml-2 opacity-70">{{ item.url }}</span>
          </div>
          <div v-if="history.length === 0" class="text-sm opacity-60 p-2">No history yet</div>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col h-full overflow-hidden">
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
        <div class="flex gap-2">
          <select v-model="method" class="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded border-none font-medium focus:ring-2 focus:ring-primary-500 outline-none">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <input v-model="url" type="text" placeholder="https://jsonplaceholder.typicode.com/todos/1" class="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded border-none focus:ring-2 focus:ring-primary-500 outline-none" @keyup.enter="sendRequest" />
          <button @click="sendRequest" :disabled="isLoading" class="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded transition-all disabled:opacity-50 flex items-center">
            <span v-if="isLoading" class="mr-2 animate-spin">⟳</span>
            {{ isLoading ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <div class="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
          <h2 class="text-xs font-bold text-slate-500 uppercase mb-2">Request Body (JSON)</h2>
          <textarea v-model="requestBody" class="flex-1 w-full p-3 font-mono text-sm bg-slate-100 dark:bg-slate-800 rounded border-none resize-none focus:ring-1 focus:ring-primary-500 outline-none" placeholder='{ "key": "value" }'></textarea>
        </div>

        <div class="flex-1 flex flex-col p-4 bg-slate-50 dark:bg-slate-900 overflow-y-auto relative">
          <div class="flex justify-between items-center mb-2">
            <div class="flex space-x-1 bg-slate-200 dark:bg-slate-800 p-1 rounded">
              <button
                @click="activeTab = 'preview'"
                :class="activeTab === 'preview' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                class="px-3 py-1 text-xs font-bold rounded transition-all"
              >
                Preview
              </button>
              <button
                @click="activeTab = 'diff'"
                :class="activeTab === 'diff' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                class="px-3 py-1 text-xs font-bold rounded transition-all"
              >
                Diff (vs Last)
              </button>
            </div>

            <div v-if="responseMeta" class="flex gap-3 text-xs">
              <span :class="statusColorClass">{{ responseMeta.status }} {{ responseMeta.statusText }}</span>
              <span class="text-slate-400">{{ responseMeta.timeTaken }}ms</span>
            </div>
          </div>

          <div class="flex-1 relative">

            <div v-if="activeTab === 'preview'" class="h-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1117]">
              <div v-if="!responseHtml" class="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                Ready to send request
              </div>
              <div v-else v-html="responseHtml" class="h-full overflow-auto p-4 text-sm font-mono shiki-container"></div>
            </div>

            <div v-if="activeTab === 'diff'" class="h-full">
              <DiffViewer
                :old-string="lastResponseStr"
                :new-string="currentResponseStr"
              />
            </div>

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
  import DiffViewer from '@/components/DiffViewer.vue';
  import { createHighlighterCore } from 'shiki/core';
  import { createWasmOnigEngine } from 'shiki/engine/oniguruma';

  // Types
  import type { HttpMethod, ProxyResponseDto, ApiResponse } from '@repo/shared';

  // UI State
  const activeTab = ref<'preview' | 'diff'>('preview');
  const method = ref<HttpMethod>('GET');
  const url = ref('https://jsonplaceholder.typicode.com/todos/1');
  const requestBody = ref('');
  const isLoading = ref(false);
  const history = ref<any[]>([]);

  // Data State
  const responseMeta = ref<ProxyResponseDto | null>(null);
  const responseHtml = ref('');
  const currentResponseStr = ref('');
  const lastResponseStr = ref(''); // 用于 Diff 的旧数据

  // Shiki State
  const isDark = useDark();
  let highlighter: any = null;

  const initShiki = async () => {
    if (highlighter) return;
    highlighter = await createHighlighterCore({
      themes: [ import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs') ],
      langs: [ import('shiki/langs/json.mjs'), import('shiki/langs/html.mjs') ],
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

  const sendRequest = async () => {
    if (!url.value) return;

    // 存档上一次成功的响应，用于 Diff
    if (currentResponseStr.value) {
      lastResponseStr.value = currentResponseStr.value;
    }

    isLoading.value = true;
    responseHtml.value = '';
    responseMeta.value = null;

    try {
      let parsedBody = undefined;
      if (requestBody.value && ['POST', 'PUT', 'PATCH'].includes(method.value)) {
        try { parsedBody = JSON.parse(requestBody.value); } catch (e) { alert('Invalid JSON'); isLoading.value = false; return; }
      }

      const res = await api.post<ApiResponse<ProxyResponseDto>>('/proxy', {
        method: method.value,
        url: url.value,
        body: parsedBody
      });

      const data = res.data.data;
      if (data) {
        responseMeta.value = data;
        const jsonStr = JSON.stringify(data.data, null, 2);
        currentResponseStr.value = jsonStr; // 保存原始字符串供 Diff 使用
        responseHtml.value = await highlightCode(jsonStr, 'json');

        // Add to history
        history.value.unshift({ method: method.value, url: url.value, body: requestBody.value, response: jsonStr });
      } else {
        currentResponseStr.value = JSON.stringify(res.data, null, 2);
        responseHtml.value = await highlightCode(currentResponseStr.value, 'json');
      }

    } catch (error: any) {
      responseHtml.value = `<div class="text-red-500 p-4">Error: ${error.message}</div>`;
    } finally {
      isLoading.value = false;
    }
  };

  const restoreHistory = (item: any) => {
    method.value = item.method;
    url.value = item.url;
    requestBody.value = item.body;
    // 将当前屏幕内容设为“上一次”，准备与新请求做 Diff
    lastResponseStr.value = currentResponseStr.value;
    currentResponseStr.value = item.response;
    // 重新渲染高亮
    highlightCode(item.response).then(h => responseHtml.value = h);
  };

  const statusColorClass = computed(() => {
    const status = responseMeta.value?.status || 0;
    if (status >= 200 && status < 300) return 'text-green-500 font-bold';
    if (status >= 400) return 'text-red-500 font-bold';
    return 'text-yellow-500';
  });

  const methodColor = (m: string) => {
    switch(m) {
      case 'GET': return 'text-blue-500 font-bold';
      case 'POST': return 'text-green-500 font-bold';
      case 'DELETE': return 'text-red-500 font-bold';
      default: return 'text-slate-500';
    }
  };

  watch(isDark, async () => {
    if (currentResponseStr.value) {
      responseHtml.value = await highlightCode(currentResponseStr.value, 'json');
    }
  });

  initShiki();
</script>
