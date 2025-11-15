# COS外网下行流量突刺定位

COS 外网下行流量异常升高，会产生很多额外费用。

这时候就需要定位日志，查看具体是哪个文件出了问题，没走 CDN，赶紧补上。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_cS7nHzRJc2kwc4nQ.png" width="600" />

日志查找方式为，进入桶，选文件列表，输入 `cos` 前缀查询。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_XzYtnHiEzwSZjA7h.png" width="600" />

找到其中的一个日志文件，下载下来。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_ew4fNWdBH7GwcECp.png" width="600" />

执行下面的脚本，即可看到流量最大的前5个文件。

```bash
a=oneLogPath # 日志文件路径

awk '{count[$12]++} END {for (url in count) print count[url], url}' $a | sort -nr | head -n 5
```

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2025/11/own_mike_MFEY5iPxMMD2jNKQ.png" width="600" />
