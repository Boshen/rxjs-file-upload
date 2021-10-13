import { Observable, Observer, fromEvent } from 'rxjs'
import { switchMapTo } from 'rxjs/operators'

export interface HandleClickConfig {
  multiple?: boolean
  accept?: string
  directory?: boolean
}

let globalInputButton: HTMLInputElement

export const getFilesFromInput = (config: HandleClickConfig = {}): Observable<File[]> => {
  if (!globalInputButton) {
    globalInputButton = document.createElement('input')
    globalInputButton.id = 'rxjs-file-upload' // let people know where the empty input comes from
    globalInputButton.type = 'file'
    globalInputButton.setAttribute('style', 'position: fixed; left: 100%; top: 100%;')
    document.body.appendChild(globalInputButton)
  }

  return new Observable((obs: Observer<File[]>) => {
    globalInputButton.accept = config.accept || ''
    globalInputButton.multiple = config.directory || config.multiple || false
    globalInputButton['webkitdirectory'] = config.directory || false
    globalInputButton.value = ''
    globalInputButton.onchange = () => {
      const files = Array.prototype.slice.call(globalInputButton?.files ?? [])
      files.forEach((file: File) => {
        ;(<any>file).path = (<any>file).webkitRelativePath
      })
      obs.next(files)
      obs.complete()
    }
    globalInputButton.click()
    return () => {
      globalInputButton.value = ''
    }
  })
}

export const handleClick = (clickElement: HTMLElement, config: HandleClickConfig = {}): Observable<File[]> => {
  const file$ = getFilesFromInput(config)
  return fromEvent(clickElement, 'click').pipe(switchMapTo(file$))
}
