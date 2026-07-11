/// Reminder persistence, due-checking and recurrence math.
module Services.Reminders

open Models.Reminder

let private filePath = "database/reminders.json"

let getAll () : Reminder[] =
    Storage.load<Reminder[]> filePath |> Option.defaultValue [||]

let private saveAll (reminders: Reminder[]) = Storage.save filePath reminders

/// A user's reminders sorted soonest-first (ISO stamps sort as strings).
let forUser (userId: float) : Reminder[] =
    getAll ()
    |> Array.filter (fun r -> r.UserId = userId)
    |> Array.sortBy (fun r -> r.DueDate + " " + r.DueTime)

let add
    (userId: float)
    (chatId: float)
    (text: string)
    (date: string)
    (time: string)
    (repeat: string)
    : Reminder =
    let reminder =
        { Id = System.Guid.NewGuid().ToString().Substring(0, 8)
          UserId = userId
          ChatId = chatId
          Text = text
          DueDate = date
          DueTime = time
          Repeat = repeat
          CreatedAt = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm") }

    saveAll (Array.append (getAll ()) [| reminder |])
    reminder

/// Delete by 1-based position in the user's sorted list (what /reminders shows).
let deleteByIndex (userId: float) (index: int) : Reminder option =
    let mine = forUser userId

    if index < 1 || index > mine.Length then
        None
    else
        let victim = mine.[index - 1]
        saveAll (getAll () |> Array.filter (fun r -> r.Id <> victim.Id))
        Some victim

let private remove (id: string) =
    saveAll (getAll () |> Array.filter (fun r -> r.Id <> id))

/// Everything due now — or overdue (fires missed reminders after downtime).
let due (nowStamp: string) : Reminder[] =
    getAll ()
    |> Array.filter (fun r -> r.DueDate + " " + r.DueTime <= nowStamp)

let private nextDate (repeat: string) (fromDate: System.DateTime) : System.DateTime option =
    match repeat with
    | "daily" -> Some(fromDate.AddDays 1.0)
    | "weekly" -> Some(fromDate.AddDays 7.0)
    | "monthly" -> Some(fromDate.AddMonths 1)
    | s when s.StartsWith "days:" ->
        match System.Int32.TryParse (s.Substring 5) with
        | true, n when n >= 1 -> Some(fromDate.AddDays(float n))
        | _ -> None
    | _ -> None // "once" and anything unrecognised

/// After a reminder fires: delete it if one-time, otherwise advance the
/// due date past now (looping covers multi-day offline gaps).
let completeOccurrence (reminder: Reminder) =
    match nextDate reminder.Repeat (System.DateTime.Parse reminder.DueDate) with
    | None -> remove reminder.Id
    | Some first ->
        let nowStamp = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm")
        let mutable next = first

        while next.ToString("yyyy-MM-dd") + " " + reminder.DueTime <= nowStamp do
            next <-
                nextDate reminder.Repeat next
                |> Option.defaultValue (next.AddDays 1.0)

        let updated = { reminder with DueDate = next.ToString("yyyy-MM-dd") }
        saveAll (getAll () |> Array.map (fun r -> if r.Id = reminder.Id then updated else r))
