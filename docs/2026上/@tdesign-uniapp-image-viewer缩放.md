# uniapp ImageViewer 双指缩放/双击放大 实现方案演进与最终选型

## 一、需求

为 `tdesign-miniprogram/packages/uniapp-components/image-viewer` 增加 **双指 pinch 缩放** + **双击放大/还原** 能力，并通过 `maxZoom` 属性控制最大放大比例。要求三端（H5、微信小程序、App）都可用，不引入额外手势库。

---

## 二、技术约束

| 端 | 关键限制 |
|---|---|
| 微信小程序 | `<swiper>` 是原生组件，**滑动手势在底层**接管，JS 层 `stopPropagation/preventDefault` 无效；没有 `disable-touch` 这种动态属性 |
| H5 | 事件机制正常，可冒泡拦截 |
| 通用 | 不能用 hammer.js 等 web-only 手势库；最稳妥的缩放载体是 uniapp 原生 `<movable-view>` |

---

## 三、方案演进

### 方案 A：`movable-area + movable-view` + 全局 `@touchmove.stop.prevent`（最初版）

```
swiper > swiper-item > movable-area > movable-view > t-image
```

- 缩放交互交给 `movable-view` 原生能力（`scale`、`scale-min`、`scale-max`、`scale-value`）
- 翻页冲突：尝试给 swiper 加 `:disable-touch="currentScale > 1"` 锁定翻页
- 防穿透：根 view 上 `@touchmove.stop.prevent="true"`

**问题**：
1. ❌ `disable-touch` 不存在 / 不起效，小程序端缩放后仍能左右翻页
2. ❌ 全局 `@touchmove.stop.prevent` 把 movable-view 的拖动/pinch 事件吃掉，缩放本身被破坏
3. ❌ 双击触发动画偏慢，疑似 `damping` 太低
4. ❌ H5 下不缩放时 swiper 也滑不动（被全局拦截误伤）

### 方案 B：缩放时把 `images` 数组动态裁成单张

缩放开始 → 把 swiper 的数据源改成只剩当前一张；还原 → 恢复完整数组。

**问题**：
- ❌ 切换 v-for 数据源会触发**重渲染闪烁**
- ❌ 索引/loadedImageIndexes 状态恢复复杂
- ❌ 体验割裂

### 方案 C：缩放时切换为独立全屏 movable 容器（脱离 swiper）

缩放态用一个独立的浮层 movable-view 全屏覆盖；翻页态走 swiper。

**问题**：
- ❌ 双击放大瞬间从 swiper-item 切换到独立容器，**位置/坐标系不连续**，图片明显偏移、跳动
- ❌ 状态机复杂、维护成本高

---

## 四、最终方案（落地版）

放弃"用 JS 强行控制小程序 swiper 翻页"的执念，改为**结构精简 + 局部拦截**：

### 4.1 模板结构

```
view (根)                              ← 不再全局拦截 touchmove
├── view.__mask                        ← 仅在蒙层上 @touchmove.prevent 防穿透
└── swiper
    └── swiper-item
        └── movable-area               ← @touchmove 仅在缩放态尝试拦截（H5 兜底）
            └── movable-view           ← 承载 scale/拖动/pinch
                └── t-image
```

### 4.2 关键改动点

| 项 | 说明 |
|---|---|
| **去掉根 view 上的 `@touchmove.stop.prevent`** | 否则 movable-view 收不到 touch，缩放彻底瘫痪 |
| **mask 上单独加 `@touchmove.prevent`** | 精准防滚动穿透，不影响缩放 |
| **`damping=100`、`friction=20`** | 双击动画跟手不拖泥带水 |
| **`onAreaTouchMove` 仅在 scale > 1 时 `stopPropagation`** | H5 端兜底，缩放后不会误触翻页；小程序受平台限制不生效，作为已知妥协 |
| **`onSwiperChange` 中重置 `currentScale = 1`** | 跨图状态隔离 |
| **`onImageDoubleTap`：300ms 内双击在 1 ↔ maxZoom 切换** | 通过 `lastTapTime` 自实现，规避 movable-view 与 swiper 双击事件冲突 |
| **`scale-value` 绑定 `index === currentSwiperIndex ? currentScale : 1`** | 仅当前 item 受 scale 控制，其它 item 始终保持 1 |

### 4.3 平台一致性

| 端 | 双指缩放 | 双击放大 | 拖动浏览 | 缩放后翻页锁定 |
|---|---|---|---|---|
| H5 | ✅ | ✅ | ✅ | ✅（onAreaTouchMove 兜底） |
| 微信小程序 | ✅ | ✅ | ✅ | ⚠️ 平台限制，缩放态仍可能左右滑（已知妥协） |
| App | ✅ | ✅ | ✅ | ✅ |

---

## 五、API 变更（走 tdesign-api SOP）

1. SQLite `t_api` 中 maxZoom 已存在（id=2803），平台位掩码从 `56` 更新为 `184`（追加 UniApp=128），描述改为"图片最大放大比例"
2. `npm run api:docs ImageViewer "UniApp" finalProject` 自动生成 `props.ts / type.ts / README.md / README.en-US.md`
3. 拷贝到目标仓库，新增 `maxZoom: { type: Number, default: 3 }`

---

## 六、设计取舍总结

| 想要 | 现实 | 取舍 |
|---|---|---|
| JS 完全控制小程序 swiper 翻页 | 原生组件不允许 | **放弃**，接受缩放态可滑的妥协 |
| 缩放/翻页都极致丝滑 | 两套手势在同一容器互相侵占 | 用 `movable-view` 原生 + 自实现双击，避免与 swiper 死磕 |
| 防穿透 | 全局拦截会破坏内部手势 | **精准在 mask 上拦截** |
| 体验连续 | 切容器/切数据都有副作用 | **保持 DOM 结构稳定**，仅靠 `currentScale` 状态驱动 |

> 核心思路：**不和平台对抗，把每件事交给最合适的元素，状态收敛到一个数 `currentScale`。**
