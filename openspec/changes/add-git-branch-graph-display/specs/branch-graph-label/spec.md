## ADDED Requirements

### Requirement: Branch labels rendered on commit graph
对于每个有分支/标签引用的提交节点，系统 SHALL 在节点右侧渲染分支名称 Badge。

#### Scenario: Local branch label
- **WHEN** 某提交关联一个 local branch 引用
- **THEN** 节点右侧显示该分支名 Badge，使用实色背景（与分支列颜色一致）+ 白色文字

#### Scenario: Remote branch label
- **WHEN** 某提交关联一个 remote branch 引用
- **THEN** 节点右侧显示该分支名 Badge，使用透明背景 + 同色边框 + 同色文字

#### Scenario: Tag label
- **WHEN** 某提交关联一个 tag 引用
- **THEN** 节点右侧显示该 tag 名 Badge，使用透明背景 + 虚线边框

### Requirement: Label truncation for long branch names
长分支名 SHALL 截断显示，防止撑破布局。

#### Scenario: Single label exceeds max width
- **WHEN** 单个分支名超过 140px 显示宽度
- **THEN** 标签文字截断并以省略号结尾

#### Scenario: Multiple refs overflow
- **WHEN** 某提交关联超过 3 个引用
- **THEN** 仅显示前 3 个标签，其余以 "+N" 形式表示

### Requirement: Graph area width adapts to labels
图区域宽度 SHALL 自动适配标签所需空间。

#### Scenario: Labels require extra width
- **WHEN** 标签总宽超出 `columns * COLUMN_WIDTH`
- **THEN** `computeGraphLayout` 返回的 `totalWidth` 包含标签溢出宽度

#### Scenario: No labels in row
- **WHEN** 所有行均无分支引用
- **THEN** `totalWidth` 等于 `columns * COLUMN_WIDTH`，向后兼容

### Requirement: Label color matches branch column
标签颜色 SHALL 与对应分支列的图线颜色一致。

#### Scenario: Color synchronization
- **WHEN** 渲染分支标签
- **THEN** 标签的 border-color 和 text-color 使用与 LayoutNode.color 相同的色值

### Requirement: Label hover shows full name
鼠标悬停 SHALL 显示截断分支名的完整名称。

#### Scenario: Hover on truncated label
- **WHEN** 用户鼠标悬停在截断的标签上
- **THEN** 通过 HTML title 属性或 Tooltip 显示完整分支名
