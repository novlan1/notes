## 一、开始


本文讲解 Docker 的基本用法。

## 二、Docker 用法

### 1. 概念

Docker 中有两个重要概念。

一个是镜像（Image）：镜像是一个文件，它是用来创建容器的，像`“Win7纯净版.rar”`文件。

另一个是容器（Container）：容器特别像一个虚拟机，容器中运行着一个完整的操作系统。可以在容器中装 Nodejs，可以执行 `npm install`，可以做一切你当前操作系统能做的事情。

另外，当前使用的真实操作系统称为“宿主机”(Host)


镜像是通过一个 Dockerfile 打包来的，它非常像我们前端的 `package.json` 文件。创建关系为：

```
Dockerfile: 类似于“package.json”
 |
 V
Image: 类似于“Win7纯净版.rar”
 |
 V
Container: 一个完整操作系统
```

### 2. 前端项目打包

#### （1）下载

官网下载 Docker Desktop。


#### （2）初始化

我们可以新建一个文件夹 `test-docker`，添加一个 `index.html`，随便写点什么，然后添加 `Dockerfile` 文件：

```
# 基于哪个镜像
FROM nginx 

# 将宿主机中的./index.html文件复制进容器里的/usr/share/nginx/html/index.html
COPY ./index.html /usr/share/nginx/html/index.html

# 容器对外暴露80端口
EXPOSE 80 
```


COPY有个要注意的点是，复制目录的时候要把dest的目录也写上，比如：

```
COPY server/ /usr/src/nodejs/server
```

不能：

```
COPY server/ /usr/src/nodejs/
```

这一点和 Shell 命令还不太一样。


#### （3）打包镜像

接下来可以对我们的测试文件夹打镜像：

```
cd test-docker
docker build -t test-docker:1.0.0 .  
```

build 命令用来制作镜像，`-t` 是给镜像打标签，`-f` 参数是指定 Dockerfile 路径，由于我们使用的是默认 Dockerfile 名称，所以可以不同填写该参数。最后一个`.`也不要省略，表示 Dockerfile 文件的所在目录，代表是当前路径，它指定镜像构建的上下文。

#### （4）创建容器并运行

然后通过镜像 test-docker 创建一个容器并运行：

```
docker run --name test-docker -d -p 3000:80 test-docker:1.0.0
```

说明：创建的容器名称是 test-docker，你可以理解为 pid，这个名称唯一，创建之后如果不删除会一直存在。`-p` 用来指定端口映射，将容器的端口3000映射到主机`80`端口上，这样就可外部访问了。


然后在当前主机的浏览器中打开 `localhost:3000`，就可以看到我们的 `index.html` 内容了。


#### （5）容器调试

可以进入容器内部：

```
docker ls -a # 查看所有容器，包括当前容器的id
docker exec -it <id> bash
```

原理实际上是启动了容器内的`/bin/bash`，此时你就可以通过`bash shell`与容器内交互了。就像远程连接了 SSH 一样。


也可以查看容器日志：

```
docker logs -f <id> # 容器id
```




上面是对静态资源的打包，其实普通的 Vue、React 项目的打包也是一样，不过要 COPY 下打包文件夹下的文件就好了，这样可以让镜像体积更小。




### 3. Node 项目打包 

对于 NodeJS 项目，比如 Koa 或者 Express 这些，和静态资源的区别只是它们需要起个服务，占个端口。

对于 Docker 来说，只要改 Dockerfile 文件，其他步骤是一样的。

这里也是新建个 Koa 服务，来测试下。

```js
// server.js
const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello World';
});

app.listen(3000);
```


```
# Dockerfile
FROM node:14.15.0

# 在容器中创建一个目录
RUN mkdir -p /usr/src/nodejs/

# 定位到容器的工作目录
WORKDIR /usr/src/nodejs/

# 把当前目录下的所有文件拷贝到 Image 的 /usr/src/nodejs/ 目录下
COPY . /usr/src/nodejs/

EXPOSE 3000
CMD npm start
```

### 4. docker 命令

镜像相关：

```
docker pull [镜像名称:版本] # 拉取镜像
docker images  # 镜像列表
docker rmi [镜像名称:版本] # 删除镜像
docker history [镜像名称:版本] # 镜像操作记录
docker tag [镜像名称:版本][新镜像名称:新版本]
docker inspect [镜像名称:版本] # 查看镜像详细
docker search [关键字] # 搜索镜像
docker login # docker hub 登陆
docker logout # docker hub 登陆
```

容器相关：

```
docker ps -a # 容器列表(所有容器)
docker ps  # 查看所有(运行的)容器
docker exec -ti <id> bash  # 以 bash 命令进入容器内
docker run -ti --name [容器名称][镜像名称:版本] bash # 启动容器并进入
docker logs <container_id> # 查看容器日志
docker top <container_id> # 查看容器最近的一个进程
docker run -ti --name [容器名称] -p 8080:80 [镜像名称:版本] bash  # 端口映射
docker rm <container_id> # 删除容器
docker stop <container_id> # 停止容器
docker start <container_id> # 开启容器
docker restart <container_id> # 重启容器
docker inspect <container_id> # 查看容器详情
docker commit [容器名称] my_image:v1.0  # 容器提交为新的镜像	
```

## 三、Docker hub 限频问题

如果在拉取镜像等操作时遇到限频问题，可以添加镜像，并重启 Docker：

```json
{
  "registry-mirrors": [
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```



## 四、相关资料

1. [Docker 搭建你的第一个 Node 项目到服务器](https://juejin.cn/post/6844904035053486087)
2. [看完这篇，再也不用焦虑如何写dockerfile了](https://juejin.cn/post/6844904081966759943)
3. [Docker —— 从入门到实践](https://yeasy.gitbook.io/docker_practice/install/mirror#macos)
4. [dockerfile详解](https://blog.csdn.net/zisefeizhu/article/details/83472190)
5. [docker run 命令的 -i -t -d选项的作用](https://blog.csdn.net/claram/article/details/104228727)


