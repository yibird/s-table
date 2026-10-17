<script setup lang="ts">
import {
  markRaw,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
  type Component,
} from 'vue';

interface DemoModule {
  default: Component;
}

const props = withDefaults(
  defineProps<{
    loader: () => Promise<DemoModule>;
    manual?: boolean;
  }>(),
  {
    manual: false,
  }
);

const root = useTemplateRef<HTMLElement>('root');
const demo = shallowRef<Component>();
const loading = ref(false);
const failed = ref(false);
let observer: IntersectionObserver | undefined;

const load = async (): Promise<void> => {
  if (demo.value || loading.value) return;

  loading.value = true;
  failed.value = false;
  try {
    demo.value = markRaw((await props.loader()).default);
    observer?.disconnect();
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};

const requestLoad = () => load().catch(() => undefined);

onMounted(() => {
  if (props.manual) return;
  if (!('IntersectionObserver' in window)) {
    requestLoad();
    return;
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) requestLoad();
    },
    { rootMargin: '600px 0px' }
  );

  if (root.value) observer.observe(root.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section ref="root" class="vp-raw s-demo-preview" :aria-busy="loading">
    <component :is="demo" v-if="demo" />
    <div v-else class="s-demo-pending">
      <span v-if="loading" class="s-demo-loading" aria-label="示例加载中" />
      <button v-else-if="manual || failed" type="button" class="s-demo-run" @click="load">
        {{ failed ? '重新加载' : '运行示例' }}
      </button>
      <span v-else class="s-demo-loading" aria-label="示例加载中" />
    </div>
  </section>
</template>
