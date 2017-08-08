import { Observable } from 'rxjs/Observable'
import { Observer } from 'rxjs/Observer'

export interface HandleClickConfig {
  multiple?: boolean
  accept?: string
  directory?: boolean
}

let globalInputButton: HTMLInputElement | undefined

export const handleClick = (clickElement: HTMLElement, config: HandleClickConfig = {}): Observable<File[]> => {

  if (!globalInputButton) {
    globalInputButton = document.createElement('input')
    globalInputButton.id = 'rxjs-file-upload' // let people know where the empty input comes from
    globalInputButton.type = 'file'
    globalInputButton.setAttribute('style', 'position: fixed; left: 100%; top: 100%;')
    document.body.appendChild(globalInputButton)
  }

  const file$ = Observable.create((obs: Observer<File>) => {
    globalInputButton!.accept = config.accept || ''
    globalInputButton!.multiple = config.directory || config.multiple || false
    globalInputButton!.webkitdirectory = config.directory || false
    globalInputButton!.value = ''
    globalInputButton!.onchange = () => {
      const files = Array.prototype.slice.call(globalInputButton!.files)
      files.forEach((file: File) => {
        (<any>file).path = file.webkitRelativePath
      })
      obs.next(files)
      obs.complete()
    }
    globalInputButton!.click()
    return () => {
      globalInputButton!.value = ''
    }
  })

  return Observable.fromEvent(clickElement, 'click')
    .switchMapTo(file$)
}
