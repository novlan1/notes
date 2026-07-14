<!-- ## 微信小游戏闪屏背景模糊问题——根因分析与优化 -->

## 1. 问题现象

闪屏背景图在微信开发者工具和真机上均模糊不清，不够锐利。

## 2. 根因分析（三层质量衰减）

### 2.1. 第一层：Canvas 未启用 DPR 缩放

`first-screen.js` 在 Cocos 引擎接管 DPR 管理**之前**就创建了 WebGL 上下文并渲染闪屏。在新版微信客户端上，小游戏 canvas 默认尺寸是 CSS 逻辑像素（如 iPhone 14 Pro Max: 430×932），而非物理像素（1290×2796）。

1500px 宽的图渲染到 430px 宽的 WebGL framebuffer → **3.5x 下采样**，图像极糊。

**修复**：在 `build-templates/wechatgame/game.ejs` 中，`first-screen.js` 启动前将 canvas 设置为物理像素分辨率：

```
canvas.width  = windowWidth  × pixelRatio
canvas.height = windowHeight × pixelRatio
```

### 2.2. 第二层：Cocos 构建时的 PNG-8 调色板转换

Cocos Creator 3.8.8 构建 wechatgame 时对闪屏图做了**三重自动处理**：

| 步骤 | 操作 | 质量损失 |
|------|------|---------|
| `processImage` | 缩放至 ~95% 尺寸 | 细微模糊 |
| `convertFormat` | 强制转为 PNG 格式 | 无（PNG 无损） |
| `quantize` | **量化为 8-bit 调色板（256色）** | **致命！渐变丢失、色彩断层** |

用户的 JPEG 源图有 1600 万色，但构建产物被压成了仅 256 色的 PNG-8。对于含渐变、阴影的照片级背景图，256 色完全不匹配——这是"不够清晰"的**最大元凶**。

**修复**：在 `scripts/post-build-wechatgame.js` 新增 `patchSplashImage()`，构建后：

1. 从 `builder.json` 读取原始源文件路径
2. 直接将源文件（保留原始格式和质量）复制到 `build/wechatgame/background.*`
3. 删除 Cocos 生成的 PNG-8 版本
4. 修补 `first-screen.js` 的 `bgName` 指向正确的文件名

### 2.3. 第三层：WebGL 纹理缺少 Mipmap

`first-screen.js` 使用 `gl.LINEAR` 过滤上传背景纹理。当纹理被轻微下采样时（1500px → 1290px canvas），LINEAR 过滤没有预降采样（mipmap），每个屏幕像素需从多个纹理像素取平均，产生"软"感。

**修复**：在 `scripts/post-build-wechatgame.js` 新增 `patchFirstScreenMipmap()`，构建后在 `updateBgTexture` 中注入 mipmap 生成代码：

```javascript
if (window.WebGL2RenderingContext) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}
```

- WebGL 2 设备（现代手机均支持）：启用 mipmap → 锐利
- WebGL 1 设备：跳过（NPOT 纹理不支持 mipmap）→ 保持原行为，不回退

### 2.4. 变更文件

| 文件 | 改动 | 作用 |
|------|------|------|
| `build-templates/wechatgame/game.ejs` | canvas DPR 早期缩放 | 消除 3.5x 下采样 |
| `scripts/post-build-wechatgame.js` | 新增 `patchSplashImage()` | 绕过 Cocos PNG-8 256色转换 |
| `scripts/post-build-wechatgame.js` | 新增 `patchFirstScreenMipmap()` | WebGL 纹理 mipmap 锐化 |

## 3. 验证

`pnpm build:mp` 成功，主包 3.53MB / 硬限 4MB。三次修复均自动生效，无需手动操作。

## 4. 图片备注

Figma 导出建议：**使用 JPEG High Quality（而非 PNG）**作为闪屏源图——Cocos 会自动转换格式，但 post-build 会替换回来，JPEG 真彩不会受到 256 色调色板限制。推荐分辨率：宽高均不超过 2048px（Cocos 会报警告），如 **945×2048**。

## 5. FAQ

### 5.1. 将 canvas 宽高设置成更大能否更清晰

```js
canvas.width = Math.round(_sysInfoStart.windowWidth * _sysInfoStart.pixelRatio * 1.5);
canvas.height = Math.round(_sysInfoStart.windowHeight * _sysInfoStart.pixelRatio * 1.5);
```

**不建议，反而会更糊。**

#### 5.1.1. 渲染链路分析

```
图片(1500×3248) → WebGL纹理 → 渲染到 canvas framebuffer → 显示到屏幕
                                                      ↑
                                                这里多一次缩放!
```

| canvas 倍数 | framebuffer 尺寸 | 图→framebuffer | framebuffer→屏幕 | 最终效果 |
|------------|-----------------|---------------|-----------------|---------|
| 1x | 1290×2796 | 1.17x 下采样 ✅ | 1:1 直接显示 ✅ | **最优** |
| 1.5x | 1935×4194 | 1.29x 上采样 ❌ | 0.67x 下采样 ❌ | 双重模糊 |

#### 5.1.2. 三个问题

1. **图上采样变糊**：1500px 放大到 1935px，`TEXTURE_MAG_FILTER = LINEAR` 插值 → 软
2. **framebuffer 二次下采样**：canvas 比屏幕物理像素大 1.5x，浏览器/系统要再缩放一次 → 又糊一层
3. **GPU 内存浪费**：framebuffer 从 14MB 涨到 32MB，只渲染一个静态闪屏，毫无收益

#### 5.1.3. 结论

**1x 物理分辨率就是最佳点**——canvas 像素 = 屏幕像素，零额外缩放，零浪费。要想更清晰只能从**图片本身**下手：Figma 导出时用最大质量 JPEG，分辨率撑到 2048px（Cocos 限制），让 `updateBgVertexBuffer` 的 fit 逻辑去做微小的下采样（LINEAR + mipmap 处理 1.1-1.3x 缩放非常锐利）。

### 5.2. 修改 canvas 大小会影响其他页面吗

**只影响启动页，不影响游戏本身。**

#### 5.2.1. 完整的 Canvas 生命周期

```
game.ejs 阶段              first-screen.js              Cocos 引擎
─────────────────          ──────────────               ──────────
canvas.width = 1290  ──→   创建 WebGL 上下文         ──→ cc.game.init()
canvas.height = 2796       渲染闪屏背景                      │
                           加载进度条                  exactFitScreen: true
                           firstScreen.end()           cc.view.setDesignResolutionSize()
                           销毁所有 WebGL 资源               │
                           删除纹理/程序/缓冲区         引擎重新设置 canvas.width/height
                                                     创建新的渲染管线
                                                           │
                                                     游戏正常渲染从这里开始
```

关键点：

- `firstScreen.end()` 会**清空一切 WebGL 资源**（删除纹理、buffer、shader program）
- 之后 Cocos 引擎启动，`exactFitScreen: true` + `SHOW_ALL` 策略会**重新设置 canvas 尺寸**（覆盖我们设的值）
- `game.ejs` 注释写的 "Do NOT manually set canvas.width/height" 说的是游戏阶段不要动——**引擎会接管 DPR**。我们改的是引擎之前的闪屏阶段，两者互不干扰

所以放心，这段代码只让闪屏清晰，不影响游戏一帧。

### 5.3. WebGL 和 Mipmap 是什么

两个都是图形学基础概念，用闪屏场景来解释：

#### 5.3.1. WebGL

**Web 版 OpenGL**，一套在浏览器/小程序里用 GPU 画图的 API。

闪屏渲染流程：
```
1. 加载图片(new Image) → 2. 上传到GPU纹理  →  3. 画到canvas(framebuffer) → 4. 显示到屏幕
   first-screen.js         gl.texImage2D      gl.drawArrays               微信渲染层
```

- **WebGL 1**：老标准，NPOT（非2的幂次方尺寸，如1500×3248）纹理不能用 mipmap
- **WebGL 2**：新标准，NPOT 支持 mipmap，现代手机都支持

微信小游戏里 `canvas.getContext('webgl2')` 获取的就是这个 GPU 接口，`gl.xxx` 所有调用都是在操作 GPU。


#### 5.3.2. Mipmap

**预生成的缩小版纹理链**，解决"大图缩小到小画布时产生摩尔纹和模糊"。

举个例子，一张 16×16 的棋盘格图：

```
原始纹理(16×16)   Mip 1(8×8)    Mip 2(4×4)   Mip 3(2×2)   Mip 4(1×1)
■■□□■■□□■■□□■■□□
■■□□■■□□■■□□■■□□    ■■□□        ■□         ■         ■
□□■■□□■■□□■■□□■■    □□■■        □■
□□■■□□■■□□■■□□■■
■■□□■■□□■■□□■■□□
■■□□■■□□■■□□■■□□
□□■■□□■■□□■■□□■■
□□■■□□■■□□■■□□■■
■■□□■■□□■■□□■■□□
■■□□■■□□■■□□■■□□
□□■■□□■■□□■■□□■■
□□■■□□■■□□■■□□■■
■■□□■■□□■■□□■■□□
■■□□■■□□■■□□■■□□
□□■■□□■■□□■■□□■■
□□■■□□■■□□■■□□■■
```

如果没有 mipmap（`LINEAR`），渲染到 5px 宽时，GPU 从 16×16 原图里硬取样——跨越多个格子取值平均 → **糊成灰**。

有了 mipmap（`LINEAR_MIPMAP_LINEAR`），GPU 直接取最接近的 Mip 层级（8×8 或 4×4），采样点少很多 → **保留棋盘格对比度，锐利**。

你的闪屏场景：
```
1500×3248 大图 → 1290×2796 canvas（缩小 ~1.17x）
LINEAR ：每个屏幕像素取 1.3 个纹理像素平均 → 微糊
LINEAR_MIPMAP_LINEAR：挑最接近缩小比的 mip 层级来取样 → 锐利
```

---

#### 5.3.3. 一句话总结

| 概念 | 一句话 |
|------|--------|
| WebGL | 在浏览器/小程序里操作 GPU 画图的接口 |
| WebGL 2 | 新版，支持 NPOT 纹理的 mipmap |
| Mipmap | 预先生成的一系列缩小版纹理，让大图缩小时保持锐利 |
| `gl.LINEAR` | 没 mipmap，大图缩小直接平均 → 微糊 |
| `gl.LINEAR_MIPMAP_LINEAR` | 有 mipmap，GPU 选最匹配的缩小层级取样 → 锐利 |
