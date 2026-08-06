/**
 * `shared/`'s single public entry point. Per `server/v2/README.md`'s communication
 * rule, every other module imports shared functionality only from here — never by
 * reaching into `shared/errors/validation-error.ts` or any other file below this one
 * directly.
 *
 * `shared/` is the dependency floor: it imports from nothing else under `server/v2/`.
 * Its own subfolders may depend on each other internally (e.g. `value-objects/`
 * imports `errors/`) — that internal layering is not visible to, and not the concern
 * of, anything outside `shared/`.
 */
export * from "./errors/index.js";
export * from "./value-objects/index.js";
export * from "./events/index.js";
export * from "./contracts/index.js";
export * from "./utils/index.js";
