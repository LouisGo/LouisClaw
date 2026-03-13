# SiYuan API 备忘录

这份备忘只建立 **当前项目需要的基本认知**，不是要把 LouisClaw 改造成直接以 SiYuan API 为主线的系统。

## 先记住项目边界

1. **LouisClaw repo 仍然是 source of truth**
2. LouisClaw repo 负责 source items / digest，SiYuan 负责可见消费面
3. 如果目标是“思源文档树里直接可见”，优先走 **官方 API**，不是仅写 Markdown 文件
4. 默认写入专用 notebook，例如 `AI-Flow`，不要碰现有业务笔记本

换句话说：

> SiYuan API 是当前“树内可见文档”能力的正确出口；但主线仍然是本地流水线，不是反过来让 SiYuan 变成主存储。

## 官方 API 基本认知

- 内核默认地址：`http://127.0.0.1:6806`
- 需要 API token（通常在设置 / 关于中查看）
- 官方文档把它当作内核 API 暴露出来，文件、文档、块、导出等能力都在里面
- 文件访问有 workspace 边界，不是任意系统文件读取器

## 当前最相关的读取表面

### 1. 文件级

#### `/api/file/getFile`

- 作用：读取工作空间内某个文件
- 适合：确认导出文件、读取工作区内已知路径的内容
- 心智模型：这是“文件系统表面”，不是“语义文档表面”

#### `/api/file/readDir`

- 作用：列出某个目录下的内容
- 适合：探测目录结构、确认某个导出根或资源目录里有什么
- 心智模型：先看目录，再决定是否继续读具体文件

### 2. 文档路径 / 映射级

#### `/api/filetree/getHPathByPath`

- 作用：根据存储路径拿到人类可读路径
- 适合：把底层路径和用户可理解的文档路径对上

#### `/api/filetree/getHPathByID`

- 作用：根据块 / 文档 ID 取可读路径
- 适合：手上只有 ID，想知道它在人眼里的位置

#### `/api/filetree/getPathByID`

- 作用：根据 ID 反查 notebook + 存储路径
- 适合：做 ID 与底层文件路径的映射

#### `/api/filetree/getIDsByHPath`

- 作用：根据人类可读路径反查 ID
- 适合：做“路径 <-> ID”双向定位

### 3. 内容导出 / 内容读取级

#### `/api/export/exportMdContent`

- 作用：把某个文档块导出成 Markdown 文本
- 适合：想要偏“内容语义”的读取，而不是直接碰底层文件
- 对当前项目的意义：如果将来需要只读拉取某些 SiYuan 文档内容，这个接口比直接读内部文件更像稳定表面

#### `/api/block/getBlockKramdown`

- 作用：读取某个块的 kramdown 内容
- 适合：块级调试、保留块语义、精细检查内容
- 心智模型：更偏底层内容结构，不等同于最终导出的 Markdown

## 当前最相关的写入表面

### `/api/notebook/lsNotebooks`

- 作用：列出可写 notebook
- 适合：查找或复用 `AI-Flow` 这类专用 notebook

### `/api/notebook/createNotebook`

- 作用：创建专用 notebook
- 适合：为 LouisClaw 建立与现有笔记隔离的消费面

### `/api/filetree/createDocWithMd`

- 作用：从 Markdown 创建树内可见文档
- 适合：把 digest 或 item 变成思源里真正能看到的文档

### `/api/filetree/getIDsByHPath`

- 作用：按人类路径查已有文档 ID
- 适合：避免重复创建、做 path -> doc id 校验

## 未来参考但暂不作为当前主线的接口

这些接口仍然重要，但当前最小实现不必一开始就走这条路：

- `/api/file/putFile`
- `/api/file/removeFile`
- `/api/file/renameFile`

原因不是它们不存在，而是：

- 当前仓库已经明确要求保持 local-first
- 当前应该优先用 API 创建专用 `AI-Flow` notebook 下的可见文档
- 不必一开始就处理更复杂的 block-level 更新和手工冲突恢复

## 对 LouisClaw 最实用的结论

### 现在就可以建立的认知

1. **SiYuan 官方确实有文件读取接口**
2. **也有文档 / 块级读取接口**
3. **这些接口适合做辅助读取、定位、导出**
4. **它们不自动改变当前项目的主存储边界**

### 对当前项目最稳的使用姿势

- 主线继续保持：LouisClaw -> process/digest -> SiYuan API visible docs
- 如果未来要补更强的 SiYuan 交互，优先考虑：
  - 继续把 API 作为写入出口
  - 用官方 API 做路径 / 文档 ID 定位
  - 在必要时再补读取、更新、冲突处理

## 一句话结论

> 现在如果目标是“让内容出现在思源文档树里”，官方 API 已经不是可选项，而是正确出口；但它仍然只是 LouisClaw 下游消费面，不取代本地流水线 source of truth。
