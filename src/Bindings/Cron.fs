/// Minimal binding for the node-cron package.
/// One scheduler tick pattern ("* * * * *" = every minute) drives all
/// time-based features: daily quotes now, reminders and reports later.
module Bindings.Cron

open Fable.Core

type ICron =
    /// schedule("m h dom mon dow", callback) — standard cron syntax.
    abstract schedule: expression: string * task: (unit -> unit) -> obj

[<ImportAll("node-cron")>]
let cron: ICron = jsNative
