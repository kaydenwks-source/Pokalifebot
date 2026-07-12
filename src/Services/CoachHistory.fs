/// Rolling per-user coach conversation memory (last 8 messages), so
/// /coach follow-ups have continuity without unbounded storage.
module Services.CoachHistory

type CoachMessage =
    { UserId: float
      Role: string // "user" | "assistant"
      Content: string
      At: string }

let private filePath = "database/coach.json"
let private keep = 8

let private getAll () : CoachMessage[] =
    Storage.load<CoachMessage[]> filePath |> Option.defaultValue [||]

let private saveAll (messages: CoachMessage[]) = Storage.save filePath messages

/// A user's recent exchange, oldest first (append order is preserved).
let historyFor (userId: float) : CoachMessage[] =
    getAll () |> Array.filter (fun m -> m.UserId = userId)

let append (userId: float) (role: string) (content: string) =
    let entry =
        { UserId = userId
          Role = role
          Content = content
          At = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm") }

    let all = getAll ()
    let others = all |> Array.filter (fun m -> m.UserId <> userId)
    let mine = Array.append (all |> Array.filter (fun m -> m.UserId = userId)) [| entry |]

    let trimmed =
        if mine.Length > keep then
            Array.skip (mine.Length - keep) mine
        else
            mine

    saveAll (Array.append others trimmed)

let clear (userId: float) =
    saveAll (getAll () |> Array.filter (fun m -> m.UserId <> userId))
