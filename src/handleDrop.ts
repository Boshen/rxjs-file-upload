import { Observable } from 'rxjs/Observable'
import * as FileAPI from 'fileapi/dist/FileAPI.html5'

import 'rxjs/add/operator/do'

export interface HandleDropOptions {
  directory: boolean
  onHover: (e: HTMLElement, hover: boolean) => void
  onDrop: (e: HTMLElement) => void
}

const createDropFolderInput = (input, container) => {
  container.style.position = 'relative'
  input.type = 'file'
  input.multiple = true
  input.webkitdirectory = true
  input.value = null
  input.style.position = 'absolute'
  input.style.opacity = '0'
  input.style.left = '0px'
  input.style.top = '0px'
  input.style.width = '100%'
  input.style.height = '100%'
  input.style.zIndex = 10000
  input.onclick = null
  container.appendChild(input)
  return () => {
    container.removeChild(input)
    input.remove()
  }
}

const getFiles = (e) => {
  const entries = FileAPI.getFiles(e)
  const files = entries.filter((file) => { // remove directories
    return !(!file.type && ((file.size % 4096) === 0 && (file.size <= 102400)))
  })
  return files
}

export const handleDrop = (
  dropElement: HTMLElement,
  options: Partial<HandleDropOptions> = {}
): Observable<File[]> => {

  const onDrop = options.onDrop || (() => {}) // tslint:disable-line
  const onHover = options.onHover || (() => {}) // tslint:disable-line

  let count = 0
  return Observable.create((obs) => {

    dropElement.ondragover = (e) => {
      e.preventDefault()
    }

    const dragleave = (cb?) => (e) => {
      count -= 1
      if (count !== 0) {
        return
      }
      e.preventDefault()
      onHover(dropElement, false)
      count = 0
      if (cb) {
        cb()
      }
    }

    dropElement.ondragenter = (enterEvent) => {
      count += 1
      if (count - 1 >= 1) {
        return
      }
      onHover(dropElement, true)
      enterEvent.preventDefault()

      if (options.directory) {
        const dropFolderInput = document.createElement('input')
        const removeInput = createDropFolderInput(dropFolderInput, dropElement)
        let changed = false
        dropFolderInput.onchange = (e) => {
          changed = true
          const files = getFiles(e)
          obs.next(files)
        }
        dropElement.ondrop = (e) => {
          const files = getFiles(e)
          if (files.length) {
            obs.next(files)
            e.preventDefault()
          }
          setTimeout(() => {
            if (!changed && files.length === 0) {
              obs.next([])
            }
            removeInput()
          }, 50)
        }
      } else {
        dropElement.ondragleave = dragleave(null)
        dropElement.ondrop = (e) => {
          const files = getFiles(e)
          if (files.length) {
            obs.next(files)
            e.preventDefault()
          }
        }

      }
    }

  })
  .do(() => {
    count = 0
    onDrop(dropElement)
    onHover(dropElement, false)
  })

}
