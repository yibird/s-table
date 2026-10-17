# @zchengfeng/s-table-core

Framework-agnostic domain layer for STable.

This package owns table concepts that do not require a renderer or a reactive
runtime:

- row key encoding and tree data access;
- selection intent and pure selection rules;
- pagination / sorting state transitions;
- column tree traversal, column order and safe object path updates;
- clipboard serialization (RFC 4180 escaping and formula-injection protection);
- virtual window math and editing primitives.

Framework packages provide the adapter layer around this package. Vue keeps
`Ref`/`computed`/`watch`, slots, VNode types and DOM behavior in
`@zchengfeng/s-table-vue`; a future React package can reuse the core without
depending on Vue.
