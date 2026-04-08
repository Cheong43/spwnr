# Spwnr 声明式注入平台 PRD（工程版 v0.1）

## 1. 文档信息

**项目代号**：Spwnr  
**文档版本**：v0.1  
**文档类型**：PRD + TDD（工程实现版）  
**当前方向**：agent package 定义、分发、声明式注入  
**阶段目标**：完成 static injection 与 session composition MVP

---

## 2. 一句话定义

> Spwnr 是一个面向 Claude Code、Codex、Copilot、OpenCode 的 agent package 平台，负责统一定义、发布、安装与声明式注入，不负责运行时调度。

---

## 3. 背景

不同 coding agent 已经具备各自的扩展入口，例如 subagents、skills、custom agents、project-level agent files、session overlays 等，但它们之间仍然存在明显碎片化：

- 定义格式不同
- 安装路径不同
- 会话注入方式不同
- 团队协作和版本管理方式不同

因此我们需要一个统一的 package 层，让 agent 能力可以：

1. 以统一 manifest 描述
2. 以统一 registry 分发
3. 以统一 adapter 编译到各宿主
4. 在不接管宿主 runtime 的前提下完成注入

---

## 4. 产品定位

Spwnr 不是：

- 新的 LLM runtime
- 跨宿主统一执行器
- 宿主内部调度与审批的替代者
- GUI 插件市场

Spwnr 是：

- 统一协议层
- 本地 registry 与 versioning 层
- host-native 资产编译层
- 静态注入与会话注入编排层

调度权、执行权、审批流程、工具调用和宿主内部生命周期，全部保留在宿主自身。

---

## 5. 产品目标

### G1. 统一描述

支持开发者使用统一 manifest 描述：

- agent 身份与说明
- persona 与系统提示
- 输入输出 schema
- skills 引用
- host 兼容性
- host 注入方式
- memory、artifacts、model binding 等元数据

### G2. 统一分发

支持 package 的：

- validate
- publish
- install
- resolve
- list
- info

### G3. 声明式注入

支持两条主路径：

- 静态注入：把 package 编译并落盘到宿主约定目录
- 会话态注入：生成 descriptor / bundle / shell snippet 供当前会话消费

### G4. 保留宿主原生 runtime

Spwnr 不做 host runtime，不实现统一 `run()` 执行闭环，不托管 agent scheduling。

### G5. 为未来扩展预留接口

保留 policy、workflow、runtime seed 等边界，供未来确有需要时再做 agentruntime 深度扩展。

---

## 6. 非目标

当前版本明确不做：

- 不做 runtime broker 产品化
- 不做 simulated backend 产品化
- 不做统一 run 生命周期
- 不做统一 memory execution plane
- 不做远程 registry 服务
- 不做 GUI 管理后台
- 不做旧命名、旧 home 目录、旧环境变量兼容

---

## 7. 目标用户

### 7.1 Package 作者

希望把 prompt、skills、schema 和宿主兼容性打包成可版本化资产的个人或团队。

### 7.2 宿主使用者

已经在 Claude Code、Codex、Copilot 或 OpenCode 中工作，希望快速注入组织内 agent 规范的人。

### 7.3 平台维护者

需要维护 package 发布、版本、签名与团队协作边界的工程团队。

---

## 8. 核心产品决策

### 8.1 Prompt-first

主入口从执行型 workflow 切换为提示注入。`spec.agent.path` 是主线必填字段，`metadata.instruction` 是必填的短摘要字段，也是 host adapter 检索与编译的核心输入之一。

### 8.2 Host-first

主线类型从 runtime/backend 语义切到 host 语义：

```ts
type HostType = 'claude_code' | 'codex' | 'copilot' | 'opencode'
```

### 8.3 Injection-first

manifest 通过 `spec.injection.hosts.<host>` 声明该 package 的静态注入和会话态注入能力：

```yaml
spec:
  injection:
    hosts:
      claude_code:
        static:
          enabled: true
          defaultScope: project
        session:
          enabled: true
          defaultScope: user
```

### 8.4 Runtime stays with host

Spwnr 只负责编译和物化 host-native 资产，不启动宿主进程，不接管宿主执行图。

### 8.5 Hard rename

产品统一命名为 `spwnr`，标准入口固定为：

- npm scope: `@spwnr/*`
- CLI: `spwnr`
- env: `SPWNR_HOME`
- default home: `~/.spwnr`

不提供任何旧命名兼容层或迁移兜底。

---

## 9. Manifest 设计

### 9.1 Package 目录建议

```text
examples/code-reviewer/
  subagent.yaml
  agent.md
  schemas/
    input.schema.json
    output.schema.json
    memory.schema.json
  skills/
    universal/
      diff-reader/
        SKILL.md
      repo-navigator/
        SKILL.md
    claude_code/
      diff-reader/
        SKILL.md
    codex/
      diff-reader/
        SKILL.md
```

### 9.2 主线字段

- `metadata.name`
- `metadata.version`
- `metadata.instruction`
- `metadata.description`
- `spec.persona`
- `spec.agent.path`
- `spec.schemas`
- `spec.injection.hosts`
- `spec.skills.universal`
- `spec.skills.hosts`
- `spec.tools`
- `spec.memory`
- `spec.compatibility`
- `spec.artifacts`
- `spec.modelBinding`

### 9.3 Host 兼容性

主线只接受：

- `claude_code`
- `codex`
- `copilot`
- `opencode`

`openclaw`、`cline`、`simulated` 不再出现在主线 manifest 和 CLI 中，只允许作为 deprecated internal seed 留在仓库内部代码里。

---

## 10. 主线模块

### 10.1 `packages/core-types`

负责导出：

- `HostType`
- `HostScope`
- `SubagentManifest`
- `InjectionHosts`
- 公共错误与枚举

### 10.2 `packages/manifest-schema`

负责：

- manifest 校验
- package 目录加载
- agent/schema/skills 引用存在性检查
- 强校验 `metadata.instruction`
- 强校验 `spec.agent.path`
- 强校验 `spec.injection.hosts`

### 10.3 `packages/registry`

负责：

- publish
- install
- list/info
- version resolve
- tarball 存储
- SQLite 元数据

### 10.4 `packages/adapters`

从 runtime adapters 转为 host adapters。

统一合同：

```ts
interface HostAdapter {
  host: HostType
  supports(mode: 'static' | 'session'): boolean
  compile(manifest: SubagentManifest): CompiledHostAsset
  materializeStatic(compiled: CompiledHostAsset, targetDir: string): Promise<MaterializedFile[]>
  composeSession(compiled: CompiledHostAsset, context: SessionContext): Promise<SessionOutput>
}
```

`composeSession()` 只返回数据，不直接启动宿主进程。

### 10.5 `packages/injector`

这是当前主线编排层，对外只暴露：

- `injectStatic()`
- `composeSession()`

职责：

- 从 registry 解析 package
- 读取 manifest 与 prompt
- 调用对应 host adapter
- 输出落盘结果或会话内容

### 10.6 `packages/policy`

当前不启用策略逻辑，只保留：

- `PolicyContext`
- `PolicyExtension`
- `NoopPolicyProvider`

作为未来 agentruntime 定制的预留接口。

### 10.7 Deprecated internal seed

`packages/broker` 与 `packages/memory` 继续保留在仓库中，但不挂主线 CLI、不出现在 happy path 中，也不是当前产品承诺的一部分。

---

## 11. Host 注入规范

### 11.1 静态注入

- Claude Code: `.claude/agents/*.md` 或 `~/.claude/agents/*.md`
- Copilot: `.github/agents/*.agent.md` 或 `~/.copilot/agents/*.agent.md`
- OpenCode: `.opencode/agents/*.md` 或 `~/.config/opencode/agents/*.md`
- Codex: `.codex/skills/<name>/SKILL.md` 与 metadata

### 11.2 会话态注入

- Claude Code: `claude --agents` 可消费的 JSON bundle
- Copilot: 临时 profile descriptor 与 shell snippet
- OpenCode: overlay / descriptor 输出
- Codex: preview-only descriptor

### 11.3 Scope

统一支持：

- `project`
- `user`

当未显式声明 `defaultScope` 时，默认值为 `project`。

---

## 12. CLI 设计

### 12.1 主线命令

- `validate`
- `publish`
- `install`
- `list`
- `info`
- `inject`
- `session`

### 12.2 注入命令

```bash
spwnr inject <name> [version] --host <host> --scope project|user [--target <dir>]
spwnr session <name> [version] --host <host> --scope project|user --format json|shell
```

### 12.3 弃用命令

`spwnr run` 仅保留为 deprecation 提示：

- 不再调度 runtime
- 不再接收 backend 作为主产品能力
- 直接引导用户使用 `inject` 或 `session`

### 12.4 `info` 增强

`spwnr info` 需要展示 host/mode 支持矩阵，例如：

```text
claude_code: static(project), session(user)
codex: static(project), session(project)
```

---

## 13. 存储与环境变量

本地存储根目录：

- `~/.spwnr`

环境变量：

- `SPWNR_HOME`

当前主线路径包括：

- registry DB: `~/.spwnr/sqlite/spwnr.db`
- tarballs: `~/.spwnr/tarballs/<name>/<version>.tar.gz`
- installed packages: `~/.spwnr/packages/<name>/<version>`

不读取旧目录，不提供迁移命令，不做 fallback。

---

## 14. 测试范围

### 14.1 Schema / validator

- `HostType` 新枚举
- `metadata.instruction`
- `spec.agent.path`
- `spec.injection.hosts`
- 拒绝 runtime-only hosts

### 14.2 Host adapter golden tests

- Claude、Copilot、OpenCode、Codex 的静态产物格式
- 文件名、目录结构、metadata

### 14.3 Session tests

- Claude JSON bundle
- Copilot shell snippet
- OpenCode descriptor
- Codex preview descriptor

### 14.4 CLI integration tests

- `spwnr inject`
- `spwnr session`
- `spwnr info`
- `spwnr run` deprecation
- `SPWNR_HOME`

### 14.5 Rename regression tests

- package name、bin、scope、env var、默认路径全部切到 `spwnr`
- 不再读取旧命名

---

## 15. 当前实现结论

Spwnr v0.1 的产品主线已经从“跨 runtime 执行平台”收敛为“agent package + host injection 平台”。

这意味着：

- package contract 更稳定
- host 适配更轻
- 调度边界更清晰
- 与宿主 native 能力的耦合更低

也意味着：

- Spwnr 不再承诺统一执行行为
- runtime、policy、memory 等更深层能力留待未来明确需求时再扩展
