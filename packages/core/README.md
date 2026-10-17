# @zchengfeng/s-table-core

Framework-agnostic domain layer for STable.

This package owns table concepts that do not require a renderer or a reactive
runtime:

- row key encoding and tree data access;
- selection intent state transitions;
- column tree traversal and safe object path updates.

Framework packages provide the adapter layer around this package. Vue keeps
`Ref`/`computed`/`watch`, slots, VNode types and DOM behavior in
`@zchengfeng/s-table-vue`; a future React package can reuse the core without
depending on Vue.
