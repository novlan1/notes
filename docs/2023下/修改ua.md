修改 `userAgent`

```ts
function replaceUA(ua) {
  try {
    navigator.__defineGetter__('userAgent', function () {
      return ua.replace(/(iPhone\s+OS\s+)([\d_]+)/i, function (_, b) {
        return b + '16_1_1';
      });
    });
  } catch (err) { }
}

replaceUA(navigator.userAgent);
```
