---
id: ros2-notes
title: ROS 2 小记：从节点图到 TF 树的那些概念
date: 2026-06-15
tags: [ROS 2, 机器人, 学习笔记]
excerpt: Topic、Service、Action、TF、URDF……ROS 2 的术语第一次让我头皮发麻。这篇是我边做边记的概念梳理，从发布订阅到坐标变换，讲给未来的自己听。
views: 980
likes: 34
comments: [{"author":"launch 文件侠","time":"2026-06-16 11:20","text":"“直接跑一个 talker 和 listener”确实是最快的上手方式，我也是这么入门的。"}]
---

## 分布式组件化

ROS 2 的核心思维是“分布式组件化”：一个机器人是若干节点（Node）的组合，节点之间通过 Topic 进行异步发布订阅，通过 Service 进行同步请求响应，通过 Action 处理带目标的长时间任务。

## 绕不开的 TF

初学最容易绕晕的是 TF。刚开始我只在 rviz 里看到一个坐标系满天飞的机器人，直到动手写 static_transform_publisher 把激光雷达的坐标绑到底盘上，才理解 TF 树就是一张“相对位姿关系网”。

## 调试工具先行

调试工具比概念更早救了我：ros2 node list、ros2 topic echo、ros2 bag record，加上 rqt_graph 的节点图，几乎能定位 80% 的通信问题。

给新手的一句话：不要背文档，直接跑一个 talker 和 listener，再把自己的传感器数据 echo 出来，所有抽象都会落地。
