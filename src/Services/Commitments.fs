/// Recurring busy-block persistence.
module Services.Commitments

open Models.Commitment

let private filePath = "database/busy.json"

let getAll () : Commitment[] =
    Storage.load<Commitment[]> filePath |> Option.defaultValue [||]

let private saveAll (items: Commitment[]) = Storage.save filePath items

/// A user's blocks sorted by day (daily first) then start time.
let forUser (userId: float) : Commitment[] =
    getAll ()
    |> Array.filter (fun c -> c.UserId = userId)
    |> Array.sortBy (fun c -> Days.order c.Day, c.At)

/// Blocks that apply to today (matching weekday or daily).
let forToday (userId: float) : Commitment[] =
    let today = Days.fullName System.DateTime.Now.DayOfWeek

    forUser userId
    |> Array.filter (fun c -> c.Day = "daily" || c.Day = today)

let add (userId: float) (name: string) (day: string) (at: string) (until: string option) : Commitment =
    let item =
        { Id = System.Guid.NewGuid().ToString().Substring(0, 8)
          UserId = userId
          Name = name.Trim()
          Day = day
          At = at
          Until = until }

    saveAll (Array.append (getAll ()) [| item |])
    item

/// Delete by 1-based position in the user's sorted list (what /busy shows).
let deleteByIndex (userId: float) (index: int) : Commitment option =
    let mine = forUser userId

    if index < 1 || index > mine.Length then
        None
    else
        let victim = mine.[index - 1]
        saveAll (getAll () |> Array.filter (fun c -> c.Id <> victim.Id))
        Some victim
