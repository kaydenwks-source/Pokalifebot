/// Journal notes and mood check-ins. Lightweight — no AI at capture time;
/// the weekly/monthly report is where mood trends and journal themes get read.
module Services.Reflections

open Models.Reflection
open Utils

let private filePath = "database/journal.json"

let getAll () : Reflection[] =
    Storage.load<Reflection[]> filePath |> Option.defaultValue [||]

let private saveAll (xs: Reflection[]) = Storage.save filePath xs

/// A user's entries, newest first.
let forUser (userId: float) : Reflection[] =
    getAll ()
    |> Array.filter (fun r -> r.UserId = userId)
    |> Array.sortByDescending (fun r -> r.Stamp)

let private today () = System.DateTime.Now.ToString("yyyy-MM-dd")

/// Reflection XP is granted at most once per day — a mood ping OR a journal
/// note counts, so a chatty day doesn't farm points. Checked BEFORE the new
/// row is written.
let private awardOncePerDay (userId: float) =
    let already =
        getAll () |> Array.exists (fun r -> r.UserId = userId && r.Date = today ())

    if not already then
        Gamification.award userId Gamification.Points.Reflect

let add (userId: float) (mood: int option) (text: string option) : Reflection =
    awardOncePerDay userId

    let r =
        { UserId = userId
          Date = today ()
          Stamp = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm")
          Mood = mood
          Text = text }

    saveAll (Array.append (getAll ()) [| r |])
    r

/// Mood ratings logged in the last `days` days.
let recentMoods (userId: float) (days: int) : int[] =
    let cutoff = System.DateTime.Now.AddDays(float -days).ToString("yyyy-MM-dd")

    forUser userId
    |> Array.filter (fun r -> r.Date > cutoff)
    |> Array.choose (fun r -> r.Mood)

let avgMood7 (userId: float) : float option =
    let ms = recentMoods userId 7
    if ms.Length = 0 then None else Some(float (Array.sum ms) / float ms.Length)
