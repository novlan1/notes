ebus 触发的全局弹窗，也要用 ebus 关闭。

假设当前页面为 A，如果进入过其他页面，比如 B，那就会在B页面也显示，如果不用 ebus，就不会在B页面关闭。

```html
<CertificationDialog
  v-if="showCertificationDialog"
  @onCloseDialog="onCloseCertificationDialog"
/>
```

```ts
export default {
  created() {
     this.$ebus.on('showCertificationDialog', this.onShowCertificationDialog);
  },
  methods: {
    onShowCertificationDialog(flag = true) {
      this.showCertificationDialog = flag;
    },
    onCloseCertificationDialog() {
      this.$ebus.emit('showCertificationDialog', false);
    },
  }
}
```

还是因为 global-component 是多例的原因，同时注意要在路由变化的时候，将弹窗关闭。

```ts
watch: {
  $route(to, from) {
    this.showPopupImage = false;
  }
```

