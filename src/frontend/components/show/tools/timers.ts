import { get } from "svelte/store"
import { activeTimers, timers } from "../../../stores"
import { loadShows } from "../../helpers/setShow"
import { _show } from "../../helpers/shows"
import { showsCache } from "./../../../stores"

export async function getTimers(showRef: any) {
  let list: any[] = []

  if (showRef.type !== undefined && showRef.type !== "show") return []
  if (!get(showsCache)[showRef.id]) await loadShows([showRef.id])

  let timers = (_show(showRef.id).slides().items().get() || [[]]).flat().filter((a: any) => a.type === "timer")

  if (timers.length) {
    timers.forEach((a: any) => {
      let timer = a.timer

      // pre 0.5.3
      if (timer.type === "countdown") timer.type = "counter"

      list.push({ showId: showRef.id, slideId: a.id, id: a.timer.id, timer })
    })
  }

  return list
}

export function getTimer(ref: any) {
  let timer: any = {}
  if (!ref.id) return timer

  if (ref.showId) {
    timer =
      _show(ref.showId)
        .slides()
        .items()
        .get()
        .flat()
        .find((a) => a.timer?.id === ref.id)?.timer || {}
    // && a.type === "timer"

    // older versions (pre 0.5.3)
    if ((timer.type as string) === "countdown") timer.type = "counter"
  } else {
    timer = get(timers)[ref.id]
  }

  return JSON.parse(JSON.stringify(timer || {}))
}

export function updateShowTimer(ref: any, timer: any) {
  if (!ref.id || !ref.showId || !ref.slideId) return

  showsCache.update((a) => {
    let items: any[] = a[ref.showId].slides[ref.slideId].items
    let index: number = items.findIndex((a) => a.timer?.id === ref.id)
    console.log(items, index)
    if (index > -1) items[index].timer = timer
    return a
  })
}

// function getSlideWithTimer(ref: any) {
//   let slide: any = _show(ref.showId).get().slide[ref.slideId]
//   let itemIndex: number | null = null

//   Object.entries(slides).forEach(([id, slide]: any) => {
//     if (itemIndex === null) {
//       console.log(slide)
//       let index = slide.items.findIndex((a: any) => a.timer?.id === ref.id)
//       if (index > -1) {
//         slideId = id
//         itemIndex = index
//       }
//     }
//   })

//   return { id: slideId, itemIndex }
// }

// ACTIONS

export function playPause(item: any) {
  let index = get(activeTimers).findIndex((a) => a.showId === item.showId && a.slideId === item.slideId && a.id === item.id)

  activeTimers.update((a) => {
    if (index < 0) a.push({ showId: item.showId, slideId: item.slideId, ...item.timer, currentTime: item.timer.start, paused: false })
    else a[index].paused = !a[index].paused
    return a
  })
}

export function playPauseGlobal(id: any, timer: any) {
  let index = get(activeTimers).findIndex((a) => a.id === id)

  activeTimers.update((a) => {
    if (index < 0) a.push({ ...timer, id, currentTime: timer.start, paused: false })
    else a[index].paused = !a[index].paused
    return a
  })

  // send(OUTPUT, ["ACTIVE_TIMERS"], get(activeTimers))
}

export function resetTimer(id: string) {
  activeTimers.set(get(activeTimers).filter((a: any) => a.id !== id))
  // send(OUTPUT, ["ACTIVE_TIMERS"], get(activeTimers))
}

export function deleteTimer(id: string) {
  let active = get(activeTimers).findIndex((a) => a.id === id)
  if (active > -1) {
    activeTimers.update((a) => {
      a.splice(active, 1)
      return a
    })
  }

  timers.update((a) => {
    delete a[id]
    return a
  })
}
