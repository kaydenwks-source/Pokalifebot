/// Task persistence. List numbers shown to users always refer to the
/// OPEN task list (done tasks disappear from numbering).
module Services.Tasks

open Models.Task

let private filePath = "database/tasks.json"

let getAll () : TaskItem[] =
    Storage.load<TaskItem[]> filePath |> Option.defaultValue [||]

let private saveAll (tasks: TaskItem[]) = Storage.save filePath tasks

/// Open tasks: highest priority first, oldest first within a priority.
let openFor (userId: float) : TaskItem[] =
    getAll ()
    |> Array.filter (fun t -> t.UserId = userId && not t.Done)
    |> Array.sortBy (fun t -> Priority.rank t.Priority, t.CreatedAt)

let add (userId: float) (text: string) (priority: string) : TaskItem =
    let task =
        { Id = System.Guid.NewGuid().ToString().Substring(0, 8)
          UserId = userId
          Text = text.Trim()
          Priority = priority
          Done = false
          CreatedAt = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm")
          DoneAt = None }

    saveAll (Array.append (getAll ()) [| task |])
    task

let private byOpenIndex (userId: float) (index: int) : TaskItem option =
    let mine = openFor userId

    if index >= 1 && index <= mine.Length then
        Some mine.[index - 1]
    else
        None

let completeByIndex (userId: float) (index: int) : TaskItem option =
    byOpenIndex userId index
    |> Option.map (fun t ->
        let updated =
            { t with
                Done = true
                DoneAt = Some(System.DateTime.Now.ToString("yyyy-MM-dd HH:mm")) }

        saveAll (getAll () |> Array.map (fun x -> if x.Id = t.Id then updated else x))
        updated)

let deleteByIndex (userId: float) (index: int) : TaskItem option =
    byOpenIndex userId index
    |> Option.map (fun t ->
        saveAll (getAll () |> Array.filter (fun x -> x.Id <> t.Id))
        t)

/// How many tasks the user completed today (for the little dopamine hit).
let doneTodayCount (userId: float) : int =
    let today = System.DateTime.Now.ToString("yyyy-MM-dd")

    getAll ()
    |> Array.filter (fun t ->
        t.UserId = userId
        && t.Done
        && (match t.DoneAt with
            | Some d -> d.StartsWith today
            | None -> false))
    |> Array.length
