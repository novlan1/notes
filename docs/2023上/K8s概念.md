# 1. 概念

这里记录下K8s的几个核心概念。

## 1.1. pod

`Pod` 是 `Kubernetes` 创建或部署的最小/最简单的基本单位，一个`Pod`代表集群上正在运行的一个进程。

一个`Pod`由一个或多个容器组成，`Pod`中容器共享网络、存储和计算资源，在同一台`Docker`主机上运行。

为什么要使用`pod`，为什么不能直接使用容器呢？使用`pod`，相当于一个逻辑主机，还记得创建一个`vm`，在`vm`上运行几个进程么，其实道理是一样的，`pod`的存在主要是让几个紧密连接的几个容器之间共享资源，例如`ip`地址，共享存储等信息。如果直接调度容器的话，那么几个容器可能运行在不同的主机上，这样就增加了系统的复杂性。


## 1.2. Pod 控制器

### 1.2.1. Deployment

无状态应用部署。`Deployment` 的作用是管理和控制`Pod`和`Replicaset`， 管控它们运行在用户期望的状态中。

### 1.2.2. Replicaset

确保预期的`Pod`副本数量。`Replicaset` 的作用就是管理和控制`Pod`，管控他们好好干活。 但是，`Replicaset` 受控于`Deployment`。

可以理解成 `Deployment` 就是总包工头，主要负责监督底下的工人`Pod`干活，确保每时每刻有用户要求数量的`Pod`在工作。如果一旦发现某个工人`Pod`不行了，就赶紧新拉一个`Pod`过来替换它。而 `ReplicaSet` 就是总包工头手下的小包工头。

从K8S使用者角度来看，用户会直接操作 `Deployment` 部署服务，而当 `Deployment` 被部署的时候，K8S 会自动生成要求的 `ReplicaSet` 和 `Pod`。用户只需要关心 `Deployment` 而不操心 `ReplicaSet`。

资源对象`Replication Controller`是 `ReplicaSet` 的前身，官方推荐用 `Deployment` 取代 `Replication Controller` 来部署服务

### 1.2.3. Daemonset

确保所有节点运行同一类`Pod`，保证每个节点上都有一个此类`Pod`运行，通常用于实现系统级后台任务。

### 1.2.4. Statefulset

有状态应用部署

### 1.2.5. Job

 一次性任务。根据用户的设置，Job管理的Pod把任务成功完成就自动退出了

### 1.2.6. Cronjob

周期性计划性任务

## 1.3. Label


标签，是K8S特色的管理方式，便于分类管理资源对象。

`Label`可以附加到各种资源对象上，例如`Node`、`Pod`、`Service`、 `RC`等，用于关联对象、查询和筛选。

一个`Label`是一个 `key-value` 的键值对，其中 `key` 与 `value` 由用户自己指定。

一个资源对象可以定义任意数量的`Label`，同一个`Label`也可以被添加到任意数量的资源对象中，也可以在对象创建后动态添加或者删除。可以通过给指定的资源对象捆绑一个或多个不同的`Label`，来实现多维度的资源分组管理功能。


## 1.4. Label选择器(Label selector )

给某个资源对象定义一个`Label`， 就相当于给它打了一个标签，随后可以通过标签选择器(`Label selector`) 查询和筛选拥有某些Label的资源对象。

标签选择器目前有两种：基于等值关系(等于、不等于)和基于集合关系(属于、不属于、存在)。


## 1.5. Service

在K8S的集群里，虽然每个`Pod`会被分配一个单独的IP地址，但由于`Pod`是有生命周期的(它们可以被创建，而且销毁之后不会再启动)，随时可能会因为业务的变更，导致这个IP地址也会随着 `Pod` 的销毁而消失，`Service`就是用来解决这个问题的核心概念。

K8S中的 `Service` 并不是我们常说的“服务”的含义，而更像是网关层，可以看作一组提供相同服务的Pod的对外访问接口、流量均衡器，`Service` 作用于哪些`Pod`，是通过**标签选择器**来定义的。

在K8S集群中，`Service` 可以看作一组提供相同服务的 `Pod` 的对外访问接口。客户端需要访问的服务就是 `Service` 对象。每个`Service`都有一个固定的虚拟IP (这个IP也被称为`Cluster IP`) ，自动并且动态地绑定后端的Pod, 所有的网络请求直接访问 `Service` 的虚拟IP，`Service`会自动向后端做转发。

`Service`除了提供稳定的对外访问方式之外，还能起到**负载均衡**`(Load Balance`) 的功能，自动把请求流量分布到后端所有的服务上，`service`可以做到对客户透明地进行水平扩展(`scale`)。

而实现 `service` 这一功能的关键， 就是`kube-proxy`。 `kube-proxy`运行在每个节点上，监听`API Server`中服务对象的变化，可通过以下三种流量调度模式: `userspace` (废弃)、`iptables` (濒临废弃)、`ipvs` (推荐，性能最好)来实现网络的转发。

`Service`是K8S服务的核心，屏蔽了服务细节，统一对外暴露服务接口， 真正做到了“微服务”。比如我们的一个服务A，部署了3个副本，也就是3个`Pod`;对于用户来说，只需要关注一个 `Service` 的入口就可以，而不需要操心究竞应该请求哪一个`Pod`。

优势非常明显，一方面外部用户不需要感知因为`Pod`上服务的意外崩溃、 K8S 重新拉起 `Pod` 而造成的IP变更，外部用户也不需要感知因升级、变更服务带来的`Pod`替换而造成的IP变化。

## 1.6. Ingress

`Service`主要负责K8S 集群内部的网络拓扑，那么集群外部怎么访问集群内部呢?这个时候就需要`Ingress`了。

`Ingress`是整个K8S集群的接入层，负责集群内外通讯。`Ingress`是 K8S 集群里工作在`OSI`网络参考模型下，第7层的应用，对外暴露的接口，典型的访问方式是`http/https`。

`Service`只能进行第四层的流量调度，表现形式是`ip+port`。`Ingress`则可以调度不同业务域、不同URL访问路径的业务流量。比如:客户端请求`http://www.qq.com`: `port ---> Ingress ---> Service ---> Pod`


## 1.7. Name

由于K8S内部，使用“资源”来定义每一种逻辑概念(功能)，所以每种“资源”，都应该有自己的“名称”。

“资源”有`api`版本(`apiversion`) 、类别(`kind`)、元数据(`metadata`) 、定义清单(`spec`)、状态(`status`) 等配置信息。

“名称”通常定义在“资源”的“元数据”信息里。在同一个 `namespace` 空间中必须是唯一的。

## 1.8. Namespace

随着项目增多、人员增加、集群规模的扩大，需要一种能够逻辑上隔离K8S内各种“资源"的方法，这就是`Namespace`。

`Namespace`是为了把一个K8S集群划分为若千个资源不可共享的虚拟集群组而诞生的。不同 `Namespace` 内的“资源”名称可以相同，相同 `Namespace` 内的同种“资源”， “名称”不能相同。

合理的使用K8S的 `Namespace`，可以使得集群管理员能够更好的对交付到K8S里的服务进行分类管理和浏览。K8S里默认存在的 `Namespace` 有: `default`、 `kube-system`、 `kube-public` 等。

# 2. yaml示例

`Deployment` 配置如下，有 `labels`、`ports`、`replicas` 等。


```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deployment.nginx.the.test.com
spec:
  minReadySeconds: 0
  replicas: 1
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      k8s-app: deployment.nginx.the.test.com
  template:
    metadata:
      labels:
        k8s-app: deployment.nginx.the.test.com
    spec:
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      nodeSelector: {}
      dnsPolicy: ClusterFirst
      containers:
        - name: nginx
          image: the/image:123-1
          ports:
            - name: container
              containerPort: 80
              protocol: TCP
          volumeMounts:
            - name: corefile
              mountPath: /data/corefile
              readOnly: false
            - name: logs
              mountPath: /data/logs
              readOnly: false
      volumes:
        - name: corefile
          hostPath:
            path: /data/corefile
        - name: logs
          hostPath:
            path: /data/logs
      imagePullSecrets:
        - name: nes-fe-secret
```


`Service` 配置如下，有 `ports` 等。


```yaml
apiVersion: v1
kind: Service
metadata:
  name: service-nginx-some-test-com
  labels: {}
  annotations: {}
spec:
  type: NodePort
  selector:
    k8s-app: deployment.nginx.the.test.com
  ports:
    - name: http
      port: 80
      protocol: TCP
      targetPort: container
      nodePort: 0
```



`Ingress` 配置如下，有 `hosts`、`http` 等。


```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: ingress-the.test.com-0
  annotations:
    kubernetes.io/ingress.class: xxxcloud
    kubernetes.io/ingress.existLbId: xxx
spec:
  tls:
    - hosts:
        - the.test.com
      secretName: the.test.com.cert
  rules:
    - host: the.test.com
      http:
        paths:
          - path: /
            backend:
              serviceName: service-nginx-some-test-com
              servicePort: 80
```

# 3. 参考

- [K8S的基本概念](https://www.jianshu.com/p/f95579548cd3)
- [K8S的基础概念](https://www.cnblogs.com/xkqwy/p/16466114.html)
- [详解K8s基本概念](https://blog.csdn.net/qq_30627241/article/details/126123488)
- [Pod控制器](https://blog.csdn.net/Drw_Dcm/article/details/127792480)



