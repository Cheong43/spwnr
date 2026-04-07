# Subagent 统一协议、仓库与代理运行时平台 PRD（工程版 v0.1）

## 1. 文档信息

**项目代号**：Orchex  
**文档版本**：v0.1  
**文档类型**：PRD（产品需求文档）  
**面向对象**：产品、架构、后端、客户端/插件、Agent 适配器、运维、安全  
**阶段目标**：完成 MVP 范围定义，支持最小可运行闭环  

---

## 2. 项目背景

当前 Claude Code、Codex、Copilot、Cline、OpenCode、OpenClaw 等 Agent 产品已经具备不同形式的扩展能力，包括但不限于：

- skills / plugins / tools
- MCP server / function calling
- subagent / custom agents / task delegation
- commands / modes / hooks / workflow orchestration

但这些能力仍处于各自封闭的格式与运行时中，存在以下问题：

1. **扩展格式碎片化**：不同 Agent 对能力包的定义方式不一致，难以复用。
2. **运行时耦合严重**：同一个能力只能绑定在某一类宿主中，迁移成本高。
3. **权限与审批模型不统一**：文件、终端、网络、浏览器等能力的安全边界难以复用。
4. **状态与记忆不可移植**：不同 Agent 的 session / memory 机制不一致。
5. **生态难以形成**：缺乏统一的 subagent 分发、安装、版本管理、兼容性声明与可观测体系。

因此，需要建设一套**统一的 Subagent 协议、仓库与代理运行时平台**，为多种宿主 Agent 提供可安装、可运行、可治理的扩展能力层。

同时，协议需要明确区分三层：

1. **Skill 层**：可复用的能力单元，作为 subagent 的能力来源
2. **Subagent 层**：面向具体任务的人格、工作流、权限与状态单元
3. **Compatibility 层**：显式标记 subagent 兼容哪些宿主与 runtime 语义

---

## 3. 产品愿景

构建一个面向多 Agent 生态的 **Orchex Runtime Layer**，使开发者可以：

- 以统一规范定义一个 Subagent 能力包，并为其绑定一个或多个 skills
- 将该能力包发布到统一仓库
- 由不同宿主 Agent 通过插件或适配器安装并调用
- 在底层复用各家原生 runtime，但由平台统一控制协议、权限、状态、版本与观测

### 3.1 一句话定义

> 一个面向 Claude Code、Codex、Cline、OpenCode、OpenClaw 等宿主的跨运行时 Subagent 平台。

### 3.2 核心定位

本产品不是新的大模型，也不是单一宿主插件市场，而是：

- **统一协议层**：定义 subagent 与 skill 的标准格式
- **统一仓库层**：分发、版本化、签名、兼容性管理
- **统一控制层**：调度、权限、状态、记忆、观测
- **宿主适配层**：将统一协议映射到各家 native runtime

---

## 4. 目标与非目标

## 4.1 产品目标

### G1. 统一描述与发布
支持开发者使用统一 manifest 描述 subagent 的：
- 身份与用途
- 输入输出 schema
- workflow / steps
- 绑定的 skills / skillRefs
- tool 能力需求
- 权限边界
- memory 声明
- 兼容宿主列表
- 宿主兼容性标识（如 `opencode`、`claude_code`、`opencode+claude_code`）

### G2. 统一安装与运行
支持宿主通过插件/适配器安装 subagent，并由平台选择或桥接底层 runtime 执行。

### G3. 统一治理
支持版本管理、权限模板、审计、调用日志、失败重试、结果标准化。

### G4. MVP 可落地
在 v0.1 支持至少 2 个宿主完成从“发布 -> 安装 -> 调用 -> 返回结果”的完整闭环。

### G5. 预留模型接口注入与算力绑定能力
支持在协议层为 subagent 预留模型接口注入能力，使未来平台化后可将“订阅某个 subagent”与“订阅其绑定模型/算力套餐”进行统一交付。

## 4.2 非目标

v0.1 不做：

- 不自研新的 LLM 推理引擎
- 不替代各家宿主原生 terminal/file/browser runtime
- 不保证不同宿主产出完全一致
- 不在首版支持 GUI 式插件市场与复杂商业结算
- 不在首版支持任意第三方语言沙箱全覆盖

---

## 5. 用户画像

## 5.1 开发者（供给侧）
需要把自己的 coding/debug/review/doc/refactor 等能力打包为可分发 subagent 的开发者或团队。

关注点：
- 开发成本低
- 可跨宿主复用
- 可版本化
- 可声明权限边界
- 可观测与可调试

## 5.2 Agent 使用者（消费侧）
使用 Claude Code / Codex / OpenCode / OpenClaw / Cline 等宿主的开发者。

关注点：
- 安装简单
- 调用稳定
- 宿主内体验统一
- 权限可控
- 输出可预期

## 5.3 平台管理员
维护私有仓库、组织策略、审批模板和审计日志的企业/团队管理员。

关注点：
- 安全治理
- 兼容性控制
- 审计和可追踪
- 团队级分发

---

## 6. 核心问题陈述

当前一个 Subagent 能力包无法天然在多宿主间迁移，主要因为：

1. **描述格式不同**：skills、plugins、subagents、commands 等抽象不同。
2. **执行环境不同**：有的偏 CLI，有的偏 IDE，有的偏本地网关。
3. **审批语义不同**：是否自动执行、何时请求确认、工具权限如何表达，各家不一致。
4. **状态管理不同**：session、memory、history 的生命周期不同。
5. **结果表示不同**：报告、patch、tool output 的结构不统一。

本产品解决的问题不是“让所有 Agent 一样”，而是：

> 让同一个 Subagent 的定义、安装、权限、状态和产物在不同宿主之间可迁移、可治理、可复用。

---

## 7. 解决方案概述

产品采用 **Control Plane + Native Runtime Backend + Model Injection Interface** 架构：

- 上层由本平台负责定义统一协议、仓库、权限策略、状态管理和观测
- 下层尽可能复用各宿主原生 runtime 作为执行后端
- 中间通过 adapter / broker 将统一协议编译到不同宿主
- 在协议中预留模型接口注入层，使 subagent 可以绑定自带模型配置、推理路由与算力套餐

### 7.1 架构原则

1. **复用宿主原生能力，不重造执行器**
2. **统一协议，非统一行为**
3. **控制面掌握在平台，执行面借用宿主**
4. **安全策略平台先定义，再向下翻译**
5. **Subagent 是能力单元，不是单纯 prompt**
6. **Skill 作为能力层供 subagent 绑定与复用**
7. **模型接口可注入，但不在 v0.1 强制绑定远程平台**
8. **后续平台模式下，subagent 可与模型/算力套餐绑定分发**

---

## 8. 产品范围（v0.1）

### 8.1 In Scope

1. Subagent Manifest 规范 v0.1
2. Registry Service（发布、查询、版本管理）
3. Runtime Broker（调度、路由、结果标准化）
4. Policy Engine（权限策略）
5. Memory / State 基础层
6. 观测与日志基础能力
7. 2 个宿主适配器（建议：OpenCode + Claude Code）
8. CLI 发布与安装工具

### 8.2 Out of Scope

1. Web 市场首页与推荐系统
2. 多租户计费与收入分成
3. 完整 GUI 管理后台
4. 所有宿主一次性全量支持
5. 复杂长生命周期自动任务编排

---

## 9. 核心能力设计

## 9.1 Subagent Package

Subagent 以“能力包”形式存在，但其内部需显式区分 **skill 层** 与 **subagent 层**：

- **Skill**：可复用的能力模块，例如 diff-reader、repo-navigator、test-runner、doc-writer
- **Subagent**：组合 persona、workflow、policy、memory，并绑定一个或多个 skills 形成可执行任务单元

最小结构建议如下：

```text
subagents/
  code-reviewer/
    subagent.yaml
    prompts/
      system.md
    workflow/
      main.yaml
    schemas/
      input.schema.json
      output.schema.json
      memory.schema.json
    skills/
      diff-reader/
        SKILL.md
      repo-navigator/
        SKILL.md
    adapters/
      claude/
      opencode/
```

### 9.1.1 Manifest 字段（v0.1）

- metadata.name
- metadata.version
- metadata.description
- spec.persona
- spec.input.schema
- spec.output.schema
- spec.workflow
- spec.skills
- spec.tools
- spec.permissions
- spec.memory
- spec.compatibility
- spec.artifacts
- spec.modelBinding（预留字段）

### 9.1.2 示例

```yaml
apiVersion: subagent.io/v0.1
kind: Subagent
metadata:
  name: code-reviewer
  version: 0.1.0
  description: Review git diff and produce actionable feedback
spec:
  persona:
    role: senior-code-reviewer
    style: systematic
    tone: concise
  input:
    schema: ./schemas/input.schema.json
  output:
    schema: ./schemas/output.schema.json
  workflow:
    entry: main
  skills:
    refs:
      - name: diff-reader
        path: ./skills/diff-reader
      - name: repo-navigator
        path: ./skills/repo-navigator
  tools:
    allow:
      - git.diff
      - fs.read
      - fs.glob
    ask:
      - bash.exec
    deny:
      - network.*
  memory:
    scope: repo
    schema: ./schemas/memory.schema.json
  compatibility:
    hosts:
      - opencode
      - claude_code
    mode: cross_host
    badges:
      - opencode
      - claude_code
  artifacts:
    - report
    - patch
  modelBinding:
    mode: injectable
    defaultProvider: local_host
    defaultModel: null
    allowOverride: true
    billing:
      mode: passthrough
```

---

## 9.2 Registry Service

Registry 负责：

- 发布 subagent package
- 查询版本与兼容性
- 拉取 manifest 与资源文件
- 校验签名与依赖
- 标记弃用版本
- 检索 subagent 绑定的 skill 集合
- 暴露宿主兼容性标识与过滤能力
- 管理模型绑定元数据与可选算力套餐声明

### 9.2.1 功能需求

#### R-REG-001 发布包
开发者可通过 CLI 发布 subagent 包到 registry。

#### R-REG-002 版本查询
调用方可按 name/version/tag 查询包。

#### R-REG-003 兼容性声明
返回该包支持的宿主、最低版本要求、能力需求。

#### R-REG-004 包签名
支持对 package 做签名校验，避免供应链污染。

#### R-REG-005 元数据检索
可按 tag、capability、宿主兼容性检索。

#### R-REG-006 Skill 检索
可查询某个 subagent 绑定了哪些 skills，以及某个 skill 被哪些 subagent 复用。

#### R-REG-007 Compatibility 检索
可按宿主兼容性筛选，例如仅显示 `opencode`、仅显示 `claude_code`、或同时兼容二者的 subagent。

#### R-REG-008 模型绑定元数据
支持记录 subagent 的默认模型、可覆盖模型、推理提供方、套餐标识与计费模式。

### 9.2.2 非功能需求

- 发布操作需幂等
- 元数据读取 P95 < 200ms
- 包下载支持缓存

---

## 9.3 Spec Compiler

Spec Compiler 将统一协议编译为不同宿主可识别的运行单元。

### 9.3.1 功能需求

#### R-COMP-001 编译至 Codex Bundle
将 manifest + workflow 编译为 Codex 可用的 agent/subagent 配置与工具定义。

#### R-COMP-002 编译至 OpenCode Bundle
输出 OpenCode agents / commands / permissions 所需结构。

#### R-COMP-003 编译校验
校验字段完整性、schema 合法性、宿主兼容性。

#### R-COMP-004 编译缓存
同一版本的编译产物可缓存。

### 9.3.2 错误处理

- schema 无效
- 声明了宿主不支持的 capability
- workflow 引用了不存在的 step/tool
- 权限模板冲突

---

## 9.4 Runtime Broker

Runtime Broker 负责把一次 subagent 调用路由到对应宿主执行后端，并标准化返回。

### 9.4.1 关键职责

- 选择 backend
- 创建会话
- 注入 memory/state
- 绑定权限策略
- 执行 workflow
- 流式收集事件
- 标准化输出与 artifacts
- 失败重试与 fallback

### 9.4.2 核心接口

#### R-BROKER-001 Spawn Run
创建一次 orchex run，返回 runId。

#### R-BROKER-002 Invoke
输入标准化 payload，触发执行。

#### R-BROKER-003 Stream Events
支持实时输出 tool call、approval、state transition、artifact 事件。

#### R-BROKER-004 Checkpoint
支持执行中保存 checkpoint。

#### R-BROKER-005 Retry / Resume
失败后可基于 checkpoint 重试。

### 9.4.3 输出标准

统一输出结构：

```json
{
  "status": "completed",
  "backend": "codex",
  "subagent": "code-reviewer",
  "result": {
    "summary": "3 issues found",
    "issues": [],
    "artifacts": []
  },
  "trace_id": "trace_xxx"
}
```

---

## 9.5 Policy Engine

Policy Engine 用于平台级定义权限，再翻译到宿主。

### 9.5.1 权限域

- filesystem
- shell
- network
- browser
- external tool / MCP

### 9.5.2 权限级别

- allow：自动允许
- ask：需审批
- deny：禁止

### 9.5.3 功能需求

#### R-POL-001 权限模板
支持包级、组织级、运行级覆盖。

#### R-POL-002 宿主翻译
将统一权限映射为宿主的 native approval / permission model。

#### R-POL-003 冲突解决
运行级 > 组织级 > 包级。

#### R-POL-004 风险命令拦截
对高风险 shell / network 行为强制 ask 或 deny。

---

## 9.6 Memory / State Layer

### 9.6.1 状态分层

1. **Run State**：workflow 当前步骤、中间结果、待审批状态
2. **Agent Memory**：repo 经验、偏好、长期事实
3. **Artifact State**：报告、patch、日志、输出文件

### 9.6.2 功能需求

#### R-MEM-001 Run State 存取
支持按 runId 读写中间状态。

#### R-MEM-002 Agent Scoped Memory
支持按 subagent + project scope 存储长期记忆。

#### R-MEM-003 Artifact 存储
支持输出 artifact 的 URI 和元数据管理。

#### R-MEM-004 Checkpoint Snapshot
可在关键步骤保存状态快照。

---

## 9.7 Observability

### 9.7.1 需要观测的事件

- run created
- backend selected
- workflow step started/finished
- tool call started/finished
- approval requested/approved/denied
- retry triggered
- artifact emitted
- run completed/failed

### 9.7.2 指标

- 调用次数
- 成功率
- 平均耗时
- P95 耗时
- 失败原因分布
- 权限拒绝率
- 各宿主兼容性表现

### 9.7.3 功能需求

#### R-OBS-001 Trace 查询
支持按 runId 查询完整事件链。

#### R-OBS-002 错误聚类
支持按 adapter/backend/error code 聚合。

#### R-OBS-003 宿主表现对比
支持同一 subagent 在不同 backend 上的表现对比。

---

## 10. 宿主适配策略

## 10.1 v0.1 支持优先级

### P1：OpenCode
原因：原生支持 agents、commands、permissions、subtask，且本地优先风格与 Orchex 更一致。

### P1：Claude Code
原因：skills、memory、本地开发体验成熟，适合验证本地落盘与轻量运行模式。

### P2：OpenClaw
原因：适合后续接入 registry、ACP、gateway 能力。

### P3：Codex
原因：已有 subagent/custom agent 抽象，但放在第二阶段接入更合适。

### P4：Cline
原因：更适合作为严格审批执行型后端。

---

## 11. 关键用户流程

## 11.1 开发者发布流程

1. 创建 subagent 包目录
2. 编写 manifest、workflow、schema
3. 绑定所需 skills 或声明 skillRefs
4. 本地执行校验
5. 编译目标宿主 bundle
6. 发布到 registry
7. 获取版本号与签名

### 验收标准

- 能成功发布一个 code-reviewer 包
- registry 可检索到版本与兼容性
- 可下载 package 元数据与资源

## 11.2 用户安装流程

1. 在宿主中执行安装命令
2. 宿主插件请求 registry 拉取 package
3. 校验签名、skill 依赖与宿主兼容性
4. 写入本地缓存 / 宿主目录
5. 完成安装

### 验收标准

- 安装耗时在合理范围内
- 安装失败时有明确错误信息
- 已安装列表可查询

## 11.3 用户调用流程

1. 用户在宿主中调用 subagent
2. Adapter 构造标准 Run Request
3. Runtime Broker 选择 backend
4. Policy Engine 生成 effective policy
5. 注入 memory/state
6. 执行并流式返回事件
7. 输出标准化结果与 artifacts

### 验收标准

- 可成功执行一次 end-to-end 调用
- 结果包含统一结构化输出
- 可查询完整 trace

---

## 12. API 草案

## 12.1 Registry API

### POST /api/v1/packages
发布包

### GET /api/v1/packages/{name}
查询包列表

### GET /api/v1/packages/{name}/{version}
查询某版本详情

### GET /api/v1/packages/{name}/{version}/download
下载包

## 12.2 Runtime API

### POST /api/v1/runs
创建 run

### POST /api/v1/runs/{runId}/invoke
执行 run

### GET /api/v1/runs/{runId}
查询状态

### GET /api/v1/runs/{runId}/events
查询事件流

### POST /api/v1/runs/{runId}/retry
重试

## 12.3 Model Injection API（预留）

### POST /api/v1/packages/{name}/{version}/bindings/model
为某个 subagent 写入默认模型绑定配置

### POST /api/v1/runs/{runId}/model-override
在允许覆盖时，为单次 run 注入模型配置

### GET /api/v1/packages/{name}/{version}/billing
查询该 subagent 绑定的模型套餐与计费模式

## 12.4 Artifact API

### GET /api/v1/runs/{runId}/artifacts
查询产物

---

## 13. 数据模型

### 13.1 subagent_versions
- id
- name
- version
- spec_blob
- compatibility
- skill_refs
- signature
- model_binding_blob
- created_at

### 13.2 runs
- run_id
- subagent_name
- subagent_version
- backend
- model_provider
- model_name
- billing_mode
- status
- input_blob
- output_blob
- trace_id
- started_at
- ended_at

### 13.3 checkpoints
- checkpoint_id
- run_id
- workflow_step
- state_blob
- created_at

### 13.4 artifacts
- artifact_id
- run_id
- type
- uri
- metadata
- created_at

---

## 14. 非功能需求

## 14.1 性能

- 本地 Registry 元数据读取 P95 < 50ms
- Run 创建 P95 < 500ms
- 标准结果返回时间受 backend 影响，但平台侧额外开销 P95 < 1s

## 14.2 可靠性

- 核心 API 可用性目标 99.9%
- run 失败后支持可恢复重试
- 关键事件与 artifact 不丢失

## 14.3 安全

- 包签名校验
- 高风险命令审计
- 权限策略显式声明
- 敏感路径默认 deny

## 14.4 可维护性

- adapter 模块化
- 统一事件协议
- 错误码标准化

---

## 15. 风险与应对

## 15.1 风险：不同宿主行为漂移

**说明**：相同 subagent 在不同 backend 的输出可能不同。  
**应对**：统一 workflow、schema 和结果标准；引入兼容性测试集。

## 15.2 风险：权限语义难映射

**说明**：宿主原生 approval/permission 模型不一致。  
**应对**：平台先定义统一权限，再由 adapter 降级映射；无法等价映射时显式告警。

## 15.3 风险：宿主升级导致 adapter 失效

**说明**：宿主接口、配置格式、插件 API 变更。  
**应对**：adapter 独立版本管理；兼容性矩阵与自动回归测试。

## 15.4 风险：供应链与恶意包

**说明**：subagent package 可能携带危险 workflow 或配置。  
**应对**：签名、审核、组织私有仓库、权限模板覆盖。

---

## 16. MVP 方案

## 16.1 MVP 目标

在 6~8 周内完成以下闭环：

- 定义 Subagent Manifest v0.1
- 实现本地 Registry 模块基础版
- 实现 Runtime Broker 基础版
- 支持 OpenCode 与 Claude Code 两个 backend
- 支持一个示例 subagent：`code-reviewer`
- 支持 CLI 发布、安装、调用
- 支持基本 trace 与 artifact 输出

## 16.2 MVP 验收条件

### 功能验收
- 能发布一个 subagent 包
- 能安装到两类宿主
- 能调用并返回标准结果
- 能查看调用 trace 和 artifact

### 工程验收
- 所有核心模块具备单元测试
- Adapter 具备集成测试
- Manifest 有 schema 校验
- 关键错误码有文档

---

## 17. 里程碑规划

### M1：协议定义（第 1-2 周）
- 完成 manifest / workflow / schema 定义
- 完成 package 目录约定
- 完成 JSON Schema 校验器

### M2：仓库与发布（第 2-3 周）
- 完成 registry API
- 完成 publish/install CLI
- 完成版本管理与签名校验基础功能

### M3：运行时闭环（第 3-5 周）
- 完成 Runtime Broker
- 完成 Policy Engine v0
- 完成 Memory / State v0

### M4：双宿主适配（第 5-7 周）
- 接入 OpenCode Adapter
- 接入 Claude Adapter
- 完成端到端联调

### M5：示例与验收（第 7-8 周）
- 发布 `code-reviewer`
- 完成兼容性测试
- 输出技术文档与开发指南

---

## 18. 技术建议（供研发参考）

### 后端
- Node.js / TypeScript
- Fastify 或轻量 HTTP 框架
- SQLite（本地元数据与状态存储）
- 本地文件系统（package / artifact / cache / logs）
- 进程内调度器或基于 SQLite 的轻量任务表

### 观测
- OpenTelemetry（可选）
- 先以本地日志与 trace 文件为主，后续再扩展远程观测后端

### CLI
- Node.js CLI
- 支持 publish / install / run / validate

### 测试
- 单元测试：Vitest/Jest
- 集成测试：本地 mock backends
- 契约测试：manifest schema + adapter output snapshot

---

## 19. 成功指标

### 北极星指标
- 被成功安装并调用的 subagent 数量

### 核心指标
- 包发布成功率
- run 成功率
- 平均执行耗时
- 双宿主兼容成功率
- 权限拒绝率
- 重试恢复成功率

### 质量指标
- 同一 subagent 跨宿主输出结构一致率
- adapter 回归失败率
- 平台自身故障率

---

## 20. 后续演进方向

1. 支持更多宿主：Claude Code、OpenClaw、Cline
2. 引入 Web 市场与组织后台
3. 支持私有团队仓库
4. 支持签名信任链与审核流
5. 支持 subagent graph / DAG orchestration
6. 支持 billing、quota、usage analytics
7. 支持更多 artifact 类型（patch、PR、test report、doc bundle）

---

## 21. 附录：一句话架构总结

> 用统一协议描述 Subagent，用统一仓库存储与分发，用统一 Broker 做调度与治理，用各家 Agent 的原生 runtime 做执行后端。

---

# TDD：Subagent 统一协议与运行时平台技术设计文档（v0.1）

## T1. 文档目的

本文档用于在 PRD 基础上补充工程实现方案，明确：

- 系统模块边界
- 服务职责与依赖关系
- 关键数据结构
- 核心时序
- 接口定义
- 存储设计
- 安全与权限实现
- 适配器实现策略
- 测试、部署与运维方案

本文档面向后端、平台、适配器、CLI、SRE、测试工程师。

---

## T2. 技术目标

v0.1 的技术目标不是实现一个完整的 Agent OS，而是完成一个最小可运行、可扩展、可验证的控制面。

### T2.1 技术目标

1. 支持统一的 Subagent Package 解析与校验
2. 支持 package 发布、拉取、版本管理
3. 支持至少两个 backend 的适配与调用
4. 支持标准化 run 生命周期
5. 支持统一权限策略与事件日志
6. 支持 checkpoint、重试、artifact 输出

### T2.2 技术约束

1. 底层执行尽量复用宿主 native runtime
2. 不依赖某单一厂商私有接口作为唯一实现前提
3. 所有协议字段必须可 schema 校验
4. 核心模块需具备模块化替换能力

---

## T3. 总体技术架构

```text
┌────────────────────────────────────────────────────────────┐
│                     Orchex Runtime Layer                   │
│                                                            │
│  Local API / CLI Layer                                     │
│    ├── Config Loader                                       │
│    ├── Request Validation                                  │
│    └── Local Auth Context (optional)                       │
│                                                            │
│  Core Modules                                              │
│    ├── Registry Module                                     │
│    ├── Compiler Module                                     │
│    ├── Runtime Broker Module                               │
│    ├── Policy Module                                       │
│    ├── Memory Module                                       │
│    └── Artifact Module                                     │
│                                                            │
│  Local Infrastructure                                      │
│    ├── SQLite                                              │
│    ├── Local File Storage                                  │
│    ├── In-process Scheduler                                │
│    └── Observability / Logs                                │
└──────────────┬─────────────────────────────────────────────┘
               │
               │ adapter sdk / backend client
               │
     ┌─────────▼─────────┐
     │ Backend Adapters   │
     ├────────────────────┤
     │ OpenCode Adapter   │
     │ Claude Adapter     │
     │ OpenClaw Adapter   │
     │ Codex Adapter      │
     │ Cline Adapter      │
     └─────────┬─────────┘
               │
               ▼
        Native Agent Runtimes
```

### T3.1 架构原则

- 控制面统一，执行面异构
- 包协议稳定，宿主适配可演进
- 核心状态落平台，宿主状态仅做运行态补充
- 所有 run 必须可追踪
- 所有高风险动作必须可审计
- 默认单机本地优先，不强依赖 Docker、K8s、Postgres、Redis 等重组件

---

## T4. 代码仓结构建议

实现原则：尽量与 OpenCode、Claude Code 等本地优先工具保持一致，默认单机、目录驱动、落盘存储，不强依赖 Docker、K8s、Postgres、Redis 等重组件。


```text
repo/
  apps/
    cli/
    local-daemon/
  packages/
    core-types/
    manifest-schema/
    compiler/
    runtime-broker/
    policy-engine/
    memory-store/
    artifact-store/
    adapter-sdk/
    adapter-opencode/
    adapter-claude/
    adapter-openclaw/
    adapter-codex/
    adapter-cline/
    event-protocol/
    observability/
  infra/
    scripts/
    packaging/
  examples/
    code-reviewer/
    bug-fixer/
```

### T4.1 模块职责

- `core-types`：公共类型定义
- `manifest-schema`：manifest / workflow / policy schema 及校验器
- `compiler`：将统一 spec 编译为 backend bundle
- `runtime-broker`：run 生命周期与路由
- `policy-engine`：权限解析与生效策略计算
- `memory-store`：run state / agent memory / checkpoint
- `artifact-store`：artifact 元数据与本地文件系统访问
- `adapter-*`：宿主 backend 实现
- `event-protocol`：统一事件模型与序列化
- `observability`：trace、metrics、logs 封装

---

## T5. 核心域模型

## T5.1 SubagentManifest

```ts
export interface SubagentManifest {
  apiVersion: string;
  kind: 'Subagent';
  metadata: {
    name: string;
    version: string;
    description?: string;
    tags?: string[];
  };
  spec: {
    persona?: {
      role?: string;
      tone?: string;
      style?: string;
    };
    input: { schema: string };
    output: { schema: string };
    workflow: {
      entry: string;
      steps?: WorkflowStep[];
    };
    skills?: {
      refs: Array<{
        name: string;
        path?: string;
        version?: string;
      }>;
    };
    tools?: ToolPolicy;
    permissions?: PermissionPolicy;
    memory?: {
      scope: 'run' | 'repo' | 'project' | 'workspace';
      schema?: string;
    };
    compatibility?: {
      hosts: Array<'opencode' | 'claude_code' | 'openclaw' | 'codex' | 'cline'>;
      mode?: 'single_host' | 'cross_host';
      minVersions?: Record<string, string>;
      badges?: string[];
    };
    artifacts?: string[];
    modelBinding?: {
      mode: 'injectable' | 'fixed' | 'platform_managed';
      defaultProvider?: string | null;
      defaultModel?: string | null;
      allowOverride?: boolean;
      endpointRef?: string | null;
      authRef?: string | null;
      billing?: {
        mode: 'passthrough' | 'bundled' | 'metered';
        sku?: string;
      };
    };
  };
}
```

## T5.2 Run

```ts
export interface RunRecord {
  runId: string;
  subagentName: string;
  subagentVersion: string;
  backend: BackendType;
  modelProvider?: string;
  modelName?: string;
  billingMode?: 'passthrough' | 'bundled' | 'metered';
  status: RunStatus;
  traceId: string;
  input: unknown;
  output?: unknown;
  errorCode?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}
```

## T5.3 Checkpoint

```ts
export interface CheckpointRecord {
  checkpointId: string;
  runId: string;
  workflowStep: string;
  state: Record<string, unknown>;
  createdAt: string;
}
```

## T5.4 Event

```ts
export interface RunEvent {
  eventId: string;
  runId: string;
  traceId: string;
  type: EventType;
  backend?: BackendType;
  ts: string;
  payload: Record<string, unknown>;
}
```

---

## T6. 服务设计

## T6.1 Local API / CLI Layer

职责：
- 提供本地 CLI 与可选本地 HTTP API
- 处理配置加载、参数校验、请求编排
- 调用本地模块或轻量后台任务

建议技术栈：
- Commander 或轻量 CLI 框架
- Fastify（仅在需要本地 HTTP 接口时启用）
- Zod / JSON Schema
- OpenTelemetry 中间件（可选）

### T6.1.1 分层

- Command Layer：CLI 命令入口
- Service Layer：业务编排
- Repository：SQLite / FS 读写
- Client：访问本地 adapter service 或宿主桥接层

## T6.2 Worker / Scheduler

职责：
- 执行异步编译、发布、run 调度、重试
- 推送 run event
- 管理 checkpoint 与 artifact 持久化

建议：
- 基于 SQLite 任务表或进程内调度
- 使用文件锁或 SQLite 锁避免重复执行

## T6.3 Registry Service

职责：
- 管理 package 元数据
- 将 package tarball 或解包目录落盘到本地文件系统
- 维护 latest/tag/version 映射
- 管理 skillRefs 与 subagent 的引用关系
- 支持按 compatibility hosts 做本地筛选
- 维护模型绑定、推理提供方、套餐 SKU 等元数据

## T6.4 Compiler Service

职责：
- 解析 Subagent Package
- 校验 manifest / schema / workflow
- 生成 backend bundle
- 写入编译缓存
- 校验 compatibility、skills 与 modelBinding 字段

## T6.5 Runtime Broker Service

职责：
- 接收 run 请求
- 选择 backend
- 解析模型绑定配置
- 构造 backend-specific execution payload
- 驱动 adapter 执行
- 聚合流式事件
- 更新状态

## T6.6 Policy Service

职责：
- 合并 package / org / request 三级策略
- 输出 effective policy
- 提供 backend-specific permission mapping

## T6.7 Memory Service

职责：
- 保存 run state
- checkpoint snapshot
- agent scoped memory
- artifact 索引
- 管理本地目录与 SQLite 间的一致性

## T6.8 Model Binding Service（预留）

职责：
- 管理 subagent 默认模型绑定
- 管理 run 级模型覆盖与注入
- 在平台模式下管理 endpoint、凭证引用、套餐 SKU 与计费模式
- 将模型绑定配置传递给 adapter 或宿主桥接层

---

## T7. Runtime Broker 设计

## T7.1 Run 生命周期

```text
CREATED
  -> VALIDATED
  -> COMPILED
  -> SCHEDULED
  -> RUNNING
  -> WAITING_APPROVAL (optional)
  -> RETRYING (optional)
  -> COMPLETED | FAILED | CANCELLED
```

### T7.1.1 状态转换规则

- `CREATED -> VALIDATED`：manifest 存在且输入 schema 校验通过
- `VALIDATED -> COMPILED`：backend bundle 可用，或编译成功
- `COMPILED -> SCHEDULED`：backend 选择完成
- `SCHEDULED -> RUNNING`：adapter 返回开始执行
- `RUNNING -> WAITING_APPROVAL`：遇到 ask 级别动作
- `WAITING_APPROVAL -> RUNNING`：审批通过
- `RUNNING -> RETRYING`：命中可重试错误
- `RUNNING -> COMPLETED`：成功输出结果
- `RUNNING -> FAILED`：不可恢复错误

## T7.2 Backend 选择策略

v0.1 采用显式优先级 + capability 过滤：

1. 调用方显式指定 backend 时优先使用指定 backend
2. 未指定时，优先选择 package compatibility 中第一个可用 backend
3. 若 backend 不可用，按降级列表 fallback
4. 若 subagent 未声明兼容当前宿主，则安装或运行阶段直接拒绝

### T7.2.1 选择输入

- package compatibility
- compatibility hosts / badges
- backend 健康状态
- required capabilities
- runtime policy
- 用户指定偏好

### T7.2.2 选择输出

```ts
interface BackendSelection {
  backend: BackendType;
  reason: string;
  fallbackChain: BackendType[];
}
```

## T7.3 Retry 策略

可重试错误：
- backend timeout
- transient network failure
- session init failed

不可重试错误：
- manifest invalid
- permission denied by policy
- output schema hard failure（超过阈值）

默认策略：
- 最多重试 2 次
- 指数退避：1s / 3s
- 可切换 fallback backend 一次

---

## T8. Adapter SDK 设计

## T8.1 Adapter 统一接口

```ts
export interface BackendAdapter {
  kind(): BackendType;
  healthCheck(): Promise<AdapterHealth>;
  compile(input: CompileContext): Promise<CompiledBundle>;
  startRun(input: StartRunInput): Promise<AdapterRunHandle>;
  streamEvents(handle: AdapterRunHandle): AsyncIterable<AdapterEvent>;
  approve?(handle: AdapterRunHandle, approval: ApprovalDecision): Promise<void>;
  cancel(handle: AdapterRunHandle): Promise<void>;
  fetchArtifacts?(handle: AdapterRunHandle): Promise<Artifact[]>;
}
```

## T8.2 Adapter 输入上下文

```ts
export interface StartRunInput {
  runId: string;
  traceId: string;
  manifest: SubagentManifest;
  bundle: CompiledBundle;
  input: unknown;
  effectivePolicy: EffectivePolicy;
  memoryContext: MemoryContext;
  modelContext?: {
    provider?: string;
    model?: string;
    endpointRef?: string | null;
    authRef?: string | null;
    billingMode?: 'passthrough' | 'bundled' | 'metered';
    sku?: string;
  };
}
```

## T8.3 Adapter 输出事件标准化

原生 backend 事件需被映射为统一事件：

- `adapter.run.started`
- `adapter.tool.started`
- `adapter.tool.finished`
- `adapter.approval.requested`
- `adapter.output.partial`
- `adapter.output.final`
- `adapter.error`
- `adapter.run.completed`

---

## T9. Compiler 设计

## T9.1 编译流程

```text
Load package
  -> Parse manifest
  -> Validate JSON schema
  -> Resolve referenced files
  -> Validate workflow graph
  -> Validate tool/policy compatibility
  -> Validate compatibility / skills / model binding
  -> Generate backend bundle
  -> Persist bundle cache
```

## T9.2 Bundle 数据结构

```ts
export interface CompiledBundle {
  backend: BackendType;
  version: string;
  manifestHash: string;
  files: Array<{
    path: string;
    contentType: string;
    content: string;
  }>;
  metadata: Record<string, unknown>;
}
```

## T9.3 缓存键

```text
cache_key = sha256(
  manifest_content +
  referenced_files_hash +
  backend_type +
  compiler_version
)
```

---

## T10. Policy Engine 设计

## T10.1 权限模型

```ts
type Decision = 'allow' | 'ask' | 'deny';

interface EffectivePolicy {
  filesystem: PolicyRule[];
  shell: PolicyRule[];
  network: PolicyRule[];
  browser?: PolicyRule[];
  tools?: PolicyRule[];
}

interface PolicyRule {
  pattern: string;
  decision: Decision;
  reason?: string;
}
```

## T10.2 合并规则

优先级：
- request overrides
- org policy
- package policy
- platform defaults

### T10.2.1 默认规则

- 敏感目录默认 deny
- 网络默认 ask 或 deny
- 高危 shell 命令默认 deny
- 未声明工具默认 deny

## T10.3 审批流

当 backend 抛出审批请求时：
1. broker 记录 `WAITING_APPROVAL`
2. 写入 pending approval 记录
3. 事件流通知调用方
4. 调用方发送 approve/reject
5. broker 转发给 adapter

---

## T11. Memory / State 设计

## T11.1 存储分层

### Run State
推荐存 SQLite，复杂结构以 JSON 文本形式落盘。

字段：
- currentStep
- stepOutputs
- retries
- pendingApproval
- backendHandleMeta

### Agent Memory
v0.1 先使用结构化 KV，不引入向量数据库作为强依赖。

字段：
- scopeKey
- memoryType
- content
- source
- createdAt

### Artifact Store
二进制或大文本对象放本地文件系统，元数据放 SQLite。

## T11.2 Checkpoint 设计

在以下节点自动 checkpoint：
- workflow step 完成后
- approval 前
- backend final output 前

---

## T12. 数据库设计

## T12.1 SQLite 表结构建议

### packages
- id text pk
- name varchar
- latest_version varchar
- created_at datetime

### package_versions
- id text pk
- package_id text fk
- version varchar
- spec_blob text
- signature varchar
- tarball_uri text
- compatibility text
- skill_refs text
- model_binding_blob text
- manifest_hash varchar
- created_at datetime

### runs
- run_id text pk
- package_name varchar
- package_version varchar
- backend varchar
- model_provider varchar
- model_name varchar
- billing_mode varchar
- status varchar
- trace_id varchar
- input_blob text
- output_blob text
- error_code varchar
- created_at datetime
- started_at datetime
- ended_at datetime

### run_events
- event_id text pk
- run_id text fk
- trace_id varchar
- event_type varchar
- backend varchar
- payload text
- created_at datetime

### checkpoints
- checkpoint_id text pk
- run_id text fk
- workflow_step varchar
- state_blob text
- created_at datetime

### artifacts
- artifact_id text pk
- run_id text fk
- artifact_type varchar
- uri text
- metadata text
- created_at datetime

### approvals
- approval_id text pk
- run_id text fk
- action varchar
- status varchar
- requested_payload text
- resolved_payload text
- created_at datetime
- resolved_at datetime

## T12.2 索引建议

- `package_versions(name, version)` 唯一索引
- `runs(status, created_at)` 复合索引
- `run_events(run_id, created_at)` 索引
- `approvals(run_id, status)` 索引

---

## T13. API 详细设计

## T13.1 发布包

### POST `/api/v1/packages`

请求：multipart 或 tarball uri + metadata

响应：

```json
{
  "name": "code-reviewer",
  "version": "0.1.0",
  "status": "published"
}
```

## T13.2 安装信息查询

### GET `/api/v1/packages/:name/:version`

响应：

```json
{
  "name": "code-reviewer",
  "version": "0.1.0",
  "compatibility": {
    "hosts": ["opencode", "claude_code"],
    "mode": "cross_host",
    "badges": ["opencode", "claude_code"]
  },
  "skills": ["diff-reader", "repo-navigator"],
  "modelBinding": {
    "mode": "injectable",
    "defaultProvider": "local_host",
    "allowOverride": true
  },
  "downloadUrl": "..."
}
```

## T13.3 创建 Run

### POST `/api/v1/runs`

请求：

```json
{
  "subagent": "code-reviewer",
  "version": "0.1.0",
  "backend": "codex",
  "input": {
    "repoPath": "/workspace/repo",
    "baseRef": "main"
  }
}
```

响应：

```json
{
  "runId": "run_xxx",
  "status": "CREATED"
}
```

## T13.4 启动 Run

### POST `/api/v1/runs/:runId/invoke`

响应：

```json
{
  "runId": "run_xxx",
  "status": "RUNNING"
}
```

## T13.5 查询事件

### GET `/api/v1/runs/:runId/events`

支持 SSE。

## T13.6 审批

### POST `/api/v1/runs/:runId/approvals/:approvalId`

请求：

```json
{
  "decision": "approve"
}
```

---

## T14. CLI 设计

## T14.1 命令列表

```bash
orchex validate ./examples/code-reviewer
orchex publish ./examples/code-reviewer
orchex install code-reviewer@0.1.0 --backend opencode
orchex run code-reviewer@0.1.0 --backend codex --input input.json
orchex logs run_xxx
orchex artifacts run_xxx
```

## T14.2 CLI 职责

- 本地 schema 校验
- package 打包
- 发布与下载
- 本地 backend 调试辅助
- run 与 logs 查询

---

## T15. 事件与观测设计

## T15.1 日志分层

- access log
- application log
- adapter log
- audit log

## T15.2 Metrics

- `runs_total`
- `runs_success_total`
- `runs_failed_total`
- `run_duration_ms`
- `adapter_compile_duration_ms`
- `approval_wait_duration_ms`
- `artifact_emit_total`

## T15.3 Trace

trace 传播字段：
- `trace_id`
- `run_id`
- `backend`
- `adapter_version`

---

## T16. 安全设计

## T16.1 包安全

- package 发布需签名
- 服务端验证 manifest hash
- 禁止未声明文件引用越界

## T16.2 运行安全

- 所有默认未声明能力 deny
- 审批动作需鉴权
- 敏感配置通过 secret manager 注入

## T16.3 审计

以下行为必须审计：
- 发布包
- 删除或弃用版本
- 运行创建
- 权限审批
- backend fallback
- 高风险命令通过

---

## T17. 测试设计

## T17.1 单元测试

覆盖：
- manifest schema 校验
- policy 合并逻辑
- backend 选择逻辑
- retry 策略
- compiler cache key

## T17.2 集成测试

- publish -> query -> download 闭环
- create run -> invoke -> event stream -> complete 闭环
- approval ask -> approve -> resume 闭环
- checkpoint -> retry -> recover 闭环

## T17.3 Adapter 契约测试

每个 adapter 必须通过统一契约：
- `compile()` 能返回 bundle
- `startRun()` 能产生 handle
- `streamEvents()` 能映射成标准事件
- `cancel()` 幂等

## T17.4 E2E 测试

首版只做两个 backend：
- OpenCode
- Claude Code

以 `code-reviewer` 为样例：
- 输入 repo path + base ref
- 输出 report artifact

---

## T18. 部署设计

## T18.1 本地开发

- 直接使用本地 SQLite 文件与 `~/.orchex/` 目录
- mock adapters 作为本地 backend
- 不要求 Docker 环境

## T18.2 运行模式

### 默认模式：单机本地模式
- Orchex 通过 CLI 启动
- 所有 package、run、artifact、log、cache 均落盘
- 适合个人开发者与本地 agent 生态集成

### 可选模式：本地守护进程模式
- 启动本地 daemon，供多个宿主共享 Orchex runtime
- 仍默认使用本地 SQLite 与本地文件目录

### 后续模式：远程协作模式
- 仅在需要团队共享 registry 或集中审计时再服务化

## T18.3 轻量部署原则

- v0.1 默认采用单机本地模式
- 所有状态优先保存在用户本地目录
- 目录建议：

```text
~/.orchex/
  config/
  registry/
  packages/
  runs/
  artifacts/
  logs/
  cache/
  sqlite/
```

- 仅在团队协作或远程托管需求出现后，才考虑服务化拆分

---

## T19. 错误码设计

### 通用错误码
- `MANIFEST_INVALID`
- `WORKFLOW_INVALID`
- `PACKAGE_NOT_FOUND`
- `BACKEND_UNAVAILABLE`
- `POLICY_DENIED`
- `APPROVAL_REQUIRED`
- `RUN_NOT_FOUND`
- `RUN_ALREADY_FINISHED`
- `ADAPTER_PROTOCOL_ERROR`
- `OUTPUT_SCHEMA_INVALID`

### 设计要求
- 错误码稳定
- 响应中带 message + details
- 内部错误与用户可见错误分离

---

## T20. v0.1 实施建议

## T20.1 优先实现顺序

1. `manifest-schema`
2. `local registry module`
3. `runtime-broker`
4. `policy-engine`
5. `adapter-sdk`
6. `adapter-opencode`
7. `adapter-claude`
8. `cli`
9. `observability`

## T20.2 首个样例包

`code-reviewer`

最小 workflow：
1. 读取 diff
2. 读取涉及文件
3. 分析问题
4. 输出结构化报告

## T20.3 延后项

- 向量 memory
- 多租户组织策略
- Web UI
- 复杂 DAG orchestrator
- package dependency system

---

## T21. 一句话技术总结

> Orchex 以统一 manifest 和 runtime broker 为中心，以 adapter 为扩展边界，以宿主 native runtime 为执行后端，以本地优先的 policy、state、artifact、trace 为治理核心。

