<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps<{
  /** 哪个组件要折叠：sidebar 是左侧导航，outline 是右侧大纲 */
  target: 'sidebar' | 'outline'
}>()

const STORAGE_KEY = `vp-${props.target}-hidden`
const isHidden = ref(false)

let detachStorageListener: (() => void) | null = null

/** 通过 inline style 直接操作 DOM，确保能盖住 VitePress 自身的 CSS 变量 / inline 样式 */
function apply() {
  const root = document.documentElement
  root.classList.toggle(`${props.target}-hidden`, isHidden.value)

  // 下一帧 DOM 更新后操作
  nextTick(() => {
    if (props.target === 'sidebar') {
      // 找 sidebar 容器（VitePress desktop + mobile 容器名不同，全部干掉）
      const sidebars = document.querySelectorAll<HTMLElement>(
        '.VPSidebar, aside.VPSidebar, .VPDoc .VPSidebar, .VPNavBar .VPSidebar'
      )
      sidebars.forEach((el) => {
        el.style.display = isHidden.value ? 'none' : ''
        el.style.setProperty('width', isHidden.value ? '0' : '', 'important')
        el.style.setProperty('min-width', isHidden.value ? '0' : '', 'important')
      })
      // 修改 document 的 CSS 变量（让 grid layout 让出空间）
      root.style.setProperty(
        '--vp-sidebar-width',
        isHidden.value ? '0px' : '',
        'important'
      )
    } else {
      // outline (右侧大纲)
      const outlines = document.querySelectorAll<HTMLElement>(
        '.VPDocOutlineContainer, .VPDoc .VPDocAside, aside.VPDocAsideContainer, .VPDocAsideContainer'
      )
      outlines.forEach((el) => {
        el.style.display = isHidden.value ? 'none' : ''
        el.style.setProperty('width', isHidden.value ? '0' : '', 'important')
        el.style.setProperty('min-width', isHidden.value ? '0' : '', 'important')
      })
      root.style.setProperty(
        '--vp-aside-width',
        isHidden.value ? '0px' : '',
        'important'
      )
    }
  })
}

function readStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeStorage(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* 隐私模式 / 无 storage，忽略 */
  }
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return
  const next = e.newValue === '1'
  if (next !== isHidden.value) {
    isHidden.value = next
  }
}

onMounted(() => {
  // 等待 VitePress 完成首次路由渲染后再 apply，否则 querySelector 找不到元素
  setTimeout(() => {
    isHidden.value = readStorage()
    apply()
  }, 50)
  window.addEventListener('storage', onStorage)
  detachStorageListener = () => window.removeEventListener('storage', onStorage)
})

onBeforeUnmount(() => {
  detachStorageListener?.()
})

watch(isHidden, () => {
  apply()
  writeStorage(isHidden.value)
})
</script>

<template>
  <button
    type="button"
    class="vp-sidebar-toggle"
    :class="[
      target === 'outline' ? 'vp-outline-toggle' : 'vp-sidebar-toggle-btn',
    ]"
    :aria-pressed="!isHidden"
    :title="
      isHidden
        ? target === 'sidebar'
          ? '展开左侧导航'
          : '展开右侧大纲'
        : target === 'sidebar'
          ? '收起左侧导航'
          : '收起右侧大纲'
    "
    @click="isHidden = !isHidden"
  >
    <span class="vp-toggle-icon">
      <template v-if="target === 'sidebar'">{{ isHidden ? '›' : '‹' }}</template>
      <template v-else>{{ isHidden ? '‹' : '›' }}</template>
    </span>
  </button>
</template>
