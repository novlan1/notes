:::info 作者

novlan1

2026.04.23

:::

## BCS 的 envFrom

`2026-04-23`

开发环境通过手动注入七彩石密钥，执行 init:env。生产环境，bcs 后台配置初始密钥，配置deployment 的 envFrom

```yaml
envFrom:
  secretRef:
    - name: xxx-secret
      optional: true
```

envFrom 是 container 级别的配置，和 ports、volumeMounts 同级，不是 Pod 级别的。
