## 1. 开始

web开发中，常有一些功能仅希望对开发、测试人员等一小部分人展示，比如测试一个小程序项目中，想让测试人员快速复制当前对应的h5页面，这时候如果页面是必须登录的，我们可以借助vconsole，然后维护一个白名单配置，在进行中拉取配置，然后展示即可。

如果项目不是必须登录的，比如新闻、博客网站，或者需要这项功能的人很多，维护白名单太费时费力，就需要另一种办法。

这里介绍一种基于摩斯密码的页面加密方式，这里的加密其实是隐藏页面某些信息，也可以将其扩展，进行其他的操作，比如发送额外的请求、管理员的切换、状态的转变等。

## 2. 实现方式

简单来说，就是把用户的点击和长按分别当成点信号和长信号，也可以理解为计算机中的0和1，当用户一段时间内的输入符合密码规则时，视为解密成功，进行相应的操作。

这里的细节点就是维护密码数组和当前正在匹配的位置，流程图如下：

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/10/morse-1664680424742.png" width="600">


## 3. 延伸

### 3.1. 多端适配

对于web项目，可以传入选择器，由JS动态监听事件，对于小程序，则需要在tap和longpress事件中，手动调用morsePwd中的相应的方法。

web项目使用方式如下：
```vue
<script>
export default {
  data() {
    return {
      morsePwd: null,
    };
  },
  mounted() {
    this.morsePwd = MorsePwd.init({
      pwd: [1, 1, 1, 2, 2, 2, 1, 1, 1],
      cb: () => {
        this.showToast('xxx');
      },
      selector: '#app',
      envType: 'H5',
    });
  },
  beforeDestroy() {
    this.morsePwd.clear();
  },
}
</script>
```

小程序项目（基于uni-app）使用方式如下：
```vue
<template>
  <div
    class="tip-match-header"
    @longpress="onLongPressWrap"
    @click.stop="onClickWrap"
  >
</template>

<script>
export default {
  data() {
    return {
      morsePwd: null,
    };
  },
  mounted() {
    this.morsePwd = MorsePwd.init({
      pwd: [1, 1, 1, 2, 2, 2, 1, 1, 1],
      cb: () => {
        this.showToast('hhh');
      },
      envType: 'MP',
    });
  },
  beforeDestroy() {
    this.morsePwd.clear();
  },
  methods: {
    onLongPressWrap() {
      this.morsePwd.longPress();
    },
    onClickWrap() {
      this.morsePwd.click();
    },
  }
}
</script>
```

### 3.2. 多实例

由于采用的面向对象的开发方式，所以可以很方便的实例化出多个密码，将其应用于多个场景。


### 3.3 密码安全

密码可以放在一个配置网站，然后调用接口去拉取，或者同步到云文件中。

密码应该定期更换，来保证安全，另外，这种加密方式应该只加密较为简单的东西，比如复制一些页面信息、辅助测试等。

