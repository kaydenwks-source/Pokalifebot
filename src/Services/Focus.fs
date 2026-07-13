/// Focus (Pomodoro) sessions. In-flight sessions are held only in memory —
/// a bot restart cancels them, which is fine for a short timer. Only FINISHED
/// sessions (completed or stopped early) are persisted, so the log is always
/// an honest record of real focus time.
module Services.Focus

open Models.Focus
open Utils

let private filePath = "database/focus.json"

/// An active, still-running session. `Timer` is the opaque setTimeout handle
/// so the command layer can cancel it on /focus stop.
type Active =
    { UserId: float
      Minutes: int
      StartedAt: string // "HH:mm" for display
      StartStamp: string // full stamp, for elapsed-time maths
      Timer: obj }

let private active = System.Collections.Generic.Dictionary<float, Active>()

let getAll () : FocusSession[] =
    Storage.load<FocusSession[]> filePath |> Option.defaultValue [||]

let private saveAll (xs: FocusSession[]) = Storage.save filePath xs

let forUser (userId: float) : FocusSession[] =
    getAll () |> Array.filter (fun s -> s.UserId = userId)

let activeFor (userId: float) : Active option =
    match active.TryGetValue userId with
    | true, a -> Some a
    | _ -> None

/// Register a new running session. The caller supplies the timer handle it
/// created so we can cancel it later.
let start (userId: float) (minutes: int) (timer: obj) : Active =
    let now = System.DateTime.Now

    let a =
        { UserId = userId
          Minutes = minutes
          StartedAt = now.ToString("HH:mm")
          StartStamp = now.ToString("yyyy-MM-dd HH:mm:ss")
          Timer = timer }

    active.[userId] <- a
    a

let private record (userId: float) (a: Active) (minutes: int) (completed: bool) : FocusSession =
    let s =
        { UserId = userId
          Date = System.DateTime.Now.ToString("yyyy-MM-dd")
          StartedAt = a.StartedAt
          Minutes = minutes
          Completed = completed }

    saveAll (Array.append (getAll ()) [| s |])
    s

/// The timer fired: persist a completed session and award XP for a real focus
/// block (>= 10 min) so tiny sessions can't farm points.
let complete (userId: float) : FocusSession option =
    match activeFor userId with
    | None -> None
    | Some a ->
        active.Remove userId |> ignore
        let s = record userId a a.Minutes true

        if a.Minutes >= 10 then
            Gamification.award userId Gamification.Points.Focus

        Some s

/// Stopped early: log the elapsed minutes as a partial session (no XP).
let stop (userId: float) : FocusSession option =
    match activeFor userId with
    | None -> None
    | Some a ->
        active.Remove userId |> ignore

        let elapsed =
            let started = System.DateTime.Parse a.StartStamp
            max 0 (int (System.DateTime.Now - started).TotalMinutes)

        Some(record userId a elapsed false)

/// Completed sessions and total minutes focused today.
let todayStats (userId: float) : int * int =
    let today = System.DateTime.Now.ToString("yyyy-MM-dd")

    let mine =
        forUser userId |> Array.filter (fun s -> s.Date = today && s.Completed)

    mine.Length, (mine |> Array.sumBy (fun s -> s.Minutes))
