import { dataPath } from "./../stores"
import { uid } from "uid"
import { MAIN } from "../../types/Channels"
import { ShowObj } from "../classes/Show"
import { history } from "../components/helpers/history"
import { checkName } from "../components/helpers/show"
import { activePopup, alertMessage, videoExtensions } from "../stores"
import { receive, send } from "../utils/request"
import { createCategory, setTempShows } from "./importHelpers"
import { get } from "svelte/store"

type OlpLesson = {
    messages: {
        files: {
            name: string
            url: string
            seconds: number
            loopVideo: boolean
        }[]
        name: string
    }[]
    lessonDescription: string
    lessonImage: string
    lessonName: string
    lessonTitle: string
}

type OlfLesson = {
  sections: {
      actions: {
        files: {
            name: string
            url: string
            seconds: number
            loopVideo: boolean
        }[],
        actionType: string,
        content: string,
      }[]
      name: string
  }[]
  lessonDescription: string
  lessonImage: string
  lessonName: string
}


export async function convertLessonsPresentation(data: any) {
  let replacer: any = {}

  alertMessage.set("popup.importing")
  activePopup.set("alert")
  createCategory("Lessons", "book")

  console.log("*******************DATA", data)
  if (data?.length>0)
  {
    let lesson:any = null
    try {
      lesson = JSON.parse(data[0].content)
    } catch (err) {
      console.error(err)
    }
    if (lesson) {
      let {lessons, tempProjects, tempShows} = (lesson.sections) 
      ? await convertOpenLessonFormat(lesson)
      : await convertOpenLessonPlaylist(lesson);
      
      // download videos/images
      send(MAIN, ["DOWNLOAD_MEDIA"], lessons)

      let replace: any = await receiveMessage()
      replace.forEach((r) => {
          if (r.type === "project") {
              let projectIndex = tempProjects.findIndex((a) => a.shows[0].id === r.from)
              if (projectIndex >= 0) tempProjects[projectIndex].shows[0].id = r.to
          } else {
              replacer[r.from] = r.to
          }
      })

      // change from remote urls to local paths
      tempShows = tempShows.map((a) => {
          Object.keys(a.show.media).forEach((id) => {
              a.show.media[id].path = replacer[a.show.media[id].path]
          })

          return a
      })

      setTempShows(tempShows)

      tempProjects.forEach((project) => {
          history({ id: "UPDATE", newData: { data: project }, location: { id: "project", page: "show" } })
      })

    }
  }

}

export async function convertOpenLessonFormat(lesson: OlfLesson) {
  
  let lessons: any[] = []
  let tempShows: any[] = []
  let tempProjects: any[] = []

  let projectShows: any = [
      { id: lesson.lessonImage, type: "image", name: "Lesson Image" },
      { id: uid(5), type: "section", name: lesson.lessonName, notes: lesson.lessonDescription },
  ]

  let currentLessonFiles: any[] = [{ name: "Lesson Image", type: "project", url: lesson.lessonImage }]

  lesson.sections.forEach((section) => {
      section.actions.forEach((action) => {
          if (action.actionType==="play")
          {
              let layoutID = uid()
              let show = new ShowObj(false, "lessons", layoutID)
              let showId = uid()
              show.name = checkName(`${lesson!.lessonName} - ${action.content}`, showId)
    
              currentLessonFiles.push(...action.files)
    
              let { slides, layout, media }: any = convertToSlides(action.files)
    
              show.slides = slides
              show.layouts[layoutID].slides = layout
              show.media = media
    
              tempShows.push({ id: showId, show })
              projectShows.push({ id: showId, type: "show" })
          }
      })
  })

  // create project
  tempProjects.push({ parent: "/", created: Date.now(), name: lesson.lessonName, shows: projectShows })

  // WIP change lesson image in project to local
  // currentLessonFiles.push({url: lesson.lessonImage, name: lesson.lessonTitle})
  lessons.push({ path: get(dataPath), name: lesson.lessonName, files: currentLessonFiles })
  
  return { lessons, tempProjects, tempShows }
}

export async function convertOpenLessonPlaylist(lesson: OlpLesson) {

    let lessons: any[] = []
    let tempShows: any[] = []
    let tempProjects: any[] = []

    let projectShows: any = [
        { id: lesson.lessonImage, type: "image", name: "Lesson Image" },
        { id: uid(5), type: "section", name: lesson.lessonTitle, notes: lesson.lessonDescription },
    ]

    let currentLessonFiles: any[] = [{ name: "Lesson Image", type: "project", url: lesson.lessonImage }]

    lesson.messages.forEach((message) => {
        let layoutID = uid()
        let show = new ShowObj(false, "lessons", layoutID)
        let showId = uid()
        show.name = checkName(`${lesson!.lessonTitle} - ${message.name}`, showId)

        currentLessonFiles.push(...message.files)

        let { slides, layout, media }: any = convertToSlides(message.files)

        show.slides = slides
        show.layouts[layoutID].slides = layout
        show.media = media

        tempShows.push({ id: showId, show })
        projectShows.push({ id: showId, type: "show" })
    })

    // create project
    tempProjects.push({ parent: "/", created: Date.now(), name: lesson.lessonName, shows: projectShows })

    // WIP change lesson image in project to local
    // currentLessonFiles.push({url: lesson.lessonImage, name: lesson.lessonTitle})
    lessons.push({ path: get(dataPath), name: lesson.lessonName, files: currentLessonFiles })
    
    return { lessons, tempProjects, tempShows }
}

async function receiveMessage() {
    return new Promise((resolve, reject) => {
        // 5 seconds
        setTimeout(() => {
            reject("Timed out!")
        }, 5000)

        receive(MAIN, {
            REPLACE_MEDIA_PATHS: (msg) => {
                resolve(msg)
            },
        })
    })
}

function convertToSlides(files) {
    console.log(files)

    let slides: any = {}
    let layout: any[] = []
    let media: any = {}

    files.forEach((file) => {
        let mediaId = uid()
        media[mediaId] = { name: file.name, path: file.url, muted: false, loop: !!file.loopVideo }
        let nextAfterMedia = !media[mediaId].loop && get(videoExtensions).find((ext) => file.url.includes(ext))

        let slideId = uid()
        slides[slideId] = {
            group: file.name,
            color: "",
            settings: {},
            notes: "",
            items: [],
        }

        let currentLayout: any = { id: slideId, background: mediaId }
        if (nextAfterMedia) currentLayout.actions = { nextAfterMedia: true }

        layout.push(currentLayout)
    })

    console.log("MEDIA", media)

    return { slides, layout, media }
}
