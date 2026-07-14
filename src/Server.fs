/// A minimal HTTP server (Phase 18 / deployment). Render's free web services
/// must listen on $PORT, and a free uptime pinger hits this URL every ~10 min
/// to keep the bot awake. It answers 200 on every path and does nothing else.
/// Locally (no PORT) it's a no-op, so `npm start` is unchanged.
module Server

open Fable.Core
open Fable.Core.JsInterop
open Bindings

type private IHttp =
    abstract createServer: handler: System.Func<obj, obj, unit> -> obj

[<ImportAll("node:http")>]
let private http: IHttp = jsNative

[<Emit("$0.writeHead(200, { 'Content-Type': 'text/plain' })")>]
let private writeHead (res: obj) : unit = jsNative

[<Emit("$0.end($1)")>]
let private endWith (res: obj) (body: string) : unit = jsNative

// Bind 0.0.0.0 explicitly — Render probes that interface for its port scan.
[<Emit("$0.listen($1, '0.0.0.0')")>]
let private listen (server: obj) (port: int) : unit = jsNative

// Fire-and-forget GET, swallowing any error (a failed ping must do nothing).
[<Emit("fetch($0).catch(() => {})")>]
let private ping (url: string) : unit = jsNative

let start () =
    match Node.tryGetEnv "PORT" with
    | None -> () // local dev: nothing pings us, so skip the server
    | Some p ->
        let server =
            http.createServer (
                System.Func<_, _, _>(fun _req res ->
                    writeHead res
                    endWith res "Momentum AI is running.")
            )

        listen server (int p)
        Utils.Logger.info (sprintf "Health server listening on port %s." p)

/// Keep the free host awake: Render spins a free service down after ~15 min
/// with no INBOUND traffic (the bot's outbound Telegram polling doesn't count).
/// So we hit our own public URL every 10 min, which resets that idle timer.
/// Render provides the public URL as RENDER_EXTERNAL_URL; no external pinger
/// needed. No-op locally where that variable is unset.
let startKeepAlive () =
    match Node.tryGetEnv "RENDER_EXTERNAL_URL" with
    | None -> ()
    | Some url ->
        Node.setInterval 600000 (fun () -> ping url) |> ignore
        Utils.Logger.info "Keep-alive: self-ping every 10 min enabled."
