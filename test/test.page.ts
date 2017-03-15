require('mocha/mocha.css')
require('mocha/mocha.js')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
mocha.setup('bdd')

import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/do'

import { chunkUpload, handleClick, handlePaste, handleDrop } from '../src'

const testClick = () => {
  describe('click', () => {
    it('should pass', () => {
      expect(false).to.equal(true)
    })
  })
}

const testPaste = () => {
  describe('paste', () => {
    it('should pass', () => {
      expect(false).to.equal(true)
    })
  })
}

const testDrop = () => {
  describe('drop', () => {
    it('should pass', () => {
      expect(false).to.equal(true)
    })
  })
}

const HOST = ''

const uploadConfig = {
  headers: {
    Authorization: ''
  },
  getChunkStartUrl: () => {
    return `${HOST}/upload/chunk`
  },
  getChunkUrl: (fileMeta, i) => {
    return `${HOST}/upload/chunk/${fileMeta.fileKey}?chunk=${i + 1}&chunks=${fileMeta.chunks}`
  },
  getChunkFinishUrl: (fileMeta) => {
    return `${HOST}/upload/chunk/${fileMeta.fileKey}`
  }
}

const handleUpload = (files$) => {
  files$
    .map((file) => {
      return chunkUpload(file, uploadConfig)
    })
    .subscribe(
      (buttons) => {
        const { start, abort, pause, resume, retry, progress$, complete$} = buttons
        start()
        Observable.fromEvent(document.getElementById('abort'), 'click')
          .subscribe(abort)
        Observable.fromEvent(document.getElementById('pause'), 'click')
          .subscribe(pause)
        Observable.fromEvent(document.getElementById('resume'), 'click')
          .subscribe(resume)
        Observable.fromEvent(document.getElementById('retry'), 'click')
          .subscribe(retry)
        progress$.subscribe((p: number) => {
          (<HTMLProgressElement>document.getElementById('progress')).value = Math.round(p * 100)
        })
        complete$.subscribe((fileMeta) => {
          console.info('complete: ', fileMeta)
        })
      },
      console.error.bind(console),
      console.info.bind(console, 'completed')
    )
}

handleUpload(
  handleClick(document.getElementById('click'), {
    multiple: true
  })
)

handleUpload(
  handlePaste(document.getElementById('paste'))
)

handleUpload(
  handleDrop(document.getElementById('drop'))
)

document.getElementById('run_test').addEventListener('click', () => {
  let oldMochaDiv = document.getElementById('mocha')
  if (oldMochaDiv) {
    document.body.removeChild(oldMochaDiv)
  }
  let mochaDiv = document.createElement('div')
  mochaDiv.id = 'mocha'
  document.body.appendChild(mochaDiv)
  mocha.run()
})
