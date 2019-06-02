require('mocha/mocha.css')
require('mocha/mocha.js')
const chai = require('chai')
const expect = chai.expect
const Suite = (<any>Mocha).Suite
const Test = (<any>Mocha).Test
mocha.setup({ ui: 'bdd' })

import { Observable, fromEvent, empty, from } from 'rxjs'
import { take, map, mergeAll, catchError } from 'rxjs/operators'

import { upload, chunkUpload, getFilesFromInput, handleClick, handlePaste, handleDrop } from '../src'

const preventDefault = (e: Event) => {
  e.preventDefault()
}

window.addEventListener('dragenter', preventDefault)
window.addEventListener('drop', preventDefault)
window.addEventListener('dragover', preventDefault)

const hostInput = <HTMLInputElement>document.getElementById('host')!
hostInput.value = window.localStorage.getItem('hostInput') || 'http://striker.project.ci'
hostInput.onkeydown = (e: KeyboardEvent) => {
  window.localStorage.setItem('hostInput', (<HTMLInputElement>e.target).value)
}
const authInput = <HTMLInputElement>document.getElementById('auth')!
authInput.value = window.localStorage.getItem('authInput') || ''
authInput.onkeydown = (e: KeyboardEvent) => {
  window.localStorage.setItem('authInput', (<HTMLInputElement>e.target).value)
}

const getUploadConfig = () => {
  const host = hostInput.value
  const auth = authInput.value
  return {
    headers: {
      Authorization: auth,
    },
    getUploadUrl: () => {
      return `${host}/upload`
    },
    getChunkStartUrl: () => {
      return `${host}/upload/chunk`
    },
    getChunkUrl: (fileMeta: any, i: number) => {
      return `${host}/upload/chunk/${fileMeta.fileKey}?chunk=${i + 1}&chunks=${fileMeta.chunks}`
    },
    getChunkFinishUrl: (fileMeta: any) => {
      return `${host}/upload/chunk/${fileMeta.fileKey}`
    },
  }
}

const handleUpload = (files$: Observable<File[]>) => {
  files$
    .pipe(
      map((files: File[]) => from(files)),
      mergeAll(),
      map((file: File) => {
        console.info('file:', file)

        const suite = Suite.create((<any>mocha).suite, file.name)
        suite.addTest(
          new Test('should be blob', () => {
            expect(file).to.be.instanceof(Blob)
          })
        )

        const list = document.getElementById('list')!
        const li = document.createElement('li')
        const $name = document.createElement('h1')
        $name.innerText = file.name
        const $abort = document.createElement('button')
        $abort.textContent = 'Abort'
        const $pause = document.createElement('button')
        $pause.textContent = 'Pause'
        const $resume = document.createElement('button')
        $resume.textContent = 'Resume'
        const $retry = document.createElement('button')
        $retry.textContent = 'Retry'
        const $progress = document.createElement('progress')
        $progress.setAttribute('value', '0')
        $progress.setAttribute('max', '1')

        li.appendChild($name)
        list.appendChild(li)

        const uploadFn: Function = /^image/.test(file.type) ? upload : chunkUpload
        const { abort, pause, resume, retry, upload$ } = uploadFn(file, getUploadConfig())

        if (abort) {
          li.appendChild($abort)
          fromEvent($abort, 'click').subscribe(abort)
        }
        if (pause) {
          li.appendChild($pause)
          fromEvent($pause, 'click').subscribe(pause)
        }
        if (resume) {
          li.appendChild($resume)
          fromEvent($resume, 'click').subscribe(resume)
        }
        if (retry) {
          li.appendChild($retry)
          fromEvent($retry, 'click').subscribe(retry)
        }

        li.appendChild($progress)

        return upload$
          .do(({ action, payload }: { action: string; payload: any }) => {
            switch (action) {
              case 'upload/pausable':
                $pause.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden')
                $resume.setAttribute('style', !payload ? 'visibility: visible' : 'visibility: hidden')
                break
              case 'upload/abortable':
                $abort.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden')
                break
              case 'upload/retryable':
                $retry.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden')
                break
              case 'upload/start':
                if (uploadFn === upload) {
                  break
                }
                let startFileMeta = payload
                console.info('start: ', startFileMeta)
                suite.addTest(
                  new Test('should have start fileMeta', () => {
                    expect(startFileMeta)
                      .to.have.property('chunkSize')
                      .that.is.a('number')
                    expect(startFileMeta)
                      .to.have.property('chunks')
                      .that.is.a('number')
                    expect(startFileMeta)
                      .to.have.property('created')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('downloadUrl')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('fileCategory')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('fileKey')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('fileName')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('fileSize')
                      .that.is.a('number')
                    expect(startFileMeta)
                      .to.have.property('fileType')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('mimeType')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('previewUrl')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('thumbnailUrl')
                      .that.is.a('string')
                    expect(startFileMeta)
                      .to.have.property('uploadedChunks')
                      .that.is.an('array')
                      .that.have.lengthOf(0)
                  })
                )
                break
              case 'upload/progress':
                let p = payload
                $progress.value = p
                suite.addTest(
                  new Test('should progress with percentage ' + p, () => {
                    expect(p).to.be.a('number')
                    expect(p).to.be.at.least(0)
                    expect(p).to.be.at.most(1)
                  })
                )
                break
              case 'upload/finish':
                let finishFileMeta = payload
                console.info('finish: ', finishFileMeta)
                suite.addTest(
                  new Test('check response data', () => {
                    expect(finishFileMeta.fileName).to.equal(file.name)
                  })
                )
                suite.addTest(
                  new Test('should have finish finishFileMeta', () => {
                    if (uploadFn === chunkUpload) {
                      expect(finishFileMeta)
                        .to.have.property('chunkSize')
                        .that.is.a('number')
                      expect(finishFileMeta)
                        .to.have.property('chunks')
                        .that.is.a('number')
                      expect(finishFileMeta)
                        .to.have.property('uploadedChunks')
                        .that.is.an('array')
                        .that.have.lengthOf(finishFileMeta.chunks)
                    }
                    expect(finishFileMeta)
                      .to.have.property('downloadUrl')
                      .that.is.a('string')
                    expect(finishFileMeta)
                      .to.have.property('fileCategory')
                      .that.is.a('string')
                    expect(finishFileMeta)
                      .to.have.property('fileKey')
                      .that.is.a('string')
                    expect(finishFileMeta)
                      .to.have.property('fileName')
                      .that.is.a('string')
                    expect(finishFileMeta)
                      .to.have.property('fileSize')
                      .that.is.a('number')
                    expect(finishFileMeta)
                      .to.have.property('fileType')
                      .that.is.a('string')
                    expect(finishFileMeta)
                      .to.have.property('mimeType')
                      .that.is.a('string')
                    expect(finishFileMeta)
                      .to.have.property('thumbnailUrl')
                      .that.is.a('string')
                  })
                )
                break
              case 'upload/start':
                console.error(payload)
                break
              default:
                break
            }
          })
          .catch((e: any) => {
            suite.addTest(
              new Test('should catch error with status ' + e.status, () => {
                expect(e.status).to.be.a('number')
                expect(e.status).to.be.at.least(400)
              })
            )
            return empty()
          })
      }),
      mergeAll(),
      catchError((_: Error, caught: Observable<Error>) => {
        return caught
      })
    )
    .subscribe(console.info.bind(console, 'final output: '))
}

handleUpload(handleClick(document.getElementById('click1')!))

handleUpload(
  handleClick(document.getElementById('click2')!, {
    multiple: true,
    // the file dialog opens very slowly in chrome
    // bug https://bugs.chromium.org/p/chromium/issues/detail?id=638874
    accept: 'image/*',
  })
)

handleUpload(
  handleClick(document.getElementById('click3')!, {
    directory: true,
  })
)

handleUpload(handlePaste(document.getElementById('paste')!))

handleUpload(
  handleDrop(document.getElementById('drop1')!, {
    onDrop: console.info.bind(console, 'on drop 1'),
    onHover: console.info.bind(console, 'on hover 1'),
  })
)

handleUpload(
  handleDrop(document.getElementById('drop2')!, {
    directory: true,
    onDrop: console.info.bind(console, 'on drop 2'),
    onHover: console.info.bind(console, 'on hover 2'),
  })
)

document.getElementById('trigger1')!.onclick = () => {
  handleUpload(getFilesFromInput())
}

const testButton = document.getElementById('test')!
fromEvent(testButton, 'click')
  .pipe(take(1))
  .subscribe(() => {
    let mochaDiv = document.createElement('div')
    mochaDiv.id = 'mocha'
    document.body.appendChild(mochaDiv)
    mocha.checkLeaks()
    mocha.run()
    testButton.remove()
  })
