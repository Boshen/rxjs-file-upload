const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const path = require('path')

chai.use(sinonChai)
const expect = chai.expect

import { Observable } from 'rxjs/Observable'
import { createMockFile } from './util'

import {
  startChunkUpload,
  finishChunkUpload,
  chunkUpload,
  uploadAllChunks
} from '../src/chunkUpload'

const config = {
  getChunkStartUrl: () => '/upload/chunk',
  getChunkUrl: (_, i) => '/url' + i,
  getChunkFinishUrl: (fileMeta) => `/uploadchunk/${fileMeta.fileKey}`
}

const createChunks = (n) => {
  return Array.apply(null, Array(n)).map((i: number) => {
    return 'chunk ' + i
  })
}

const chunkTests = [1, 2, 3, 10, 100].map(createChunks)

chunkTests.forEach((chunks) => {

  const fileMeta: any = {
    fileSize: 1000,
    fileKey: 'fileKey',
    chunks: chunks.length
  }

  describe(`chunkUpload ${chunks.length} chunks`, () => {

    const file = createMockFile('file', 'test.txt')

    let server

    beforeEach(() => {
      server = sinon.fakeServer.create()
      chunks.forEach((_: Blob, i: number) => {
        const chunkUrl = config.getChunkUrl(fileMeta, i)
        server.respondWith('POST', chunkUrl, [200, {}, ''])
      })
      server.respondWith('POST', config.getChunkStartUrl(), [200, {}, JSON.stringify(fileMeta)])
      server.respondWith('POST', config.getChunkFinishUrl(fileMeta), [200, {}, JSON.stringify(fileMeta)])
    })

    afterEach(() => {
      server.restore()
    })

    it('should startChunkUpload -> uploadAllChunks -> finishChunkUpload', () => {
      const { start } = chunkUpload(file, config)
      start()

      server.respondImmediately = true
      server.respond()

      expect(server.requests.length).to.equal(chunks.length + 2)
      expect(server.requests[0].url).to.equal(config.getChunkStartUrl())
      expect(server.requests[0].status).to.equal(200)
      for (let i = 0; i < chunks.length; i++) {
        expect(server.requests[i + 1].url).to.equal(config.getChunkUrl(fileMeta, i))
        expect(server.requests[i + 1].status).to.equal(200)
      }
      expect(server.requests[chunks.length + 1].url).to.equal(config.getChunkFinishUrl(fileMeta))
      expect(server.requests[chunks.length + 1].status).to.equal(200)

    })

    describe('startChunkUpload', () => {

      it('should post', () => {
        startChunkUpload(file, config).subscribe()
        server.respond()
        const request = server.requests[0]
        const requestBody = JSON.parse(request.requestBody)
        expect(request.url).to.equal(config.getChunkStartUrl())
        expect(request.status).to.equal(200)
        expect(requestBody).to.have.all.keys('fileMD5', 'fileName', 'fileSize', 'lastUpdated')
        expect(requestBody.fileMD5).to.be.a('string')
        expect(requestBody.fileName).to.equal(file['name'])
        expect(requestBody.fileSize).to.equal(file['size'])
        expect(requestBody.lastUpdated).to.equal(file['lastModifiedDate'])
      })

    })

    describe('finishChunkUpload', () => {

      it('should post', () => {
        finishChunkUpload(fileMeta, config).subscribe()
        server.respond()
        const request = server.requests[0]
        expect(request.url).to.equal(config.getChunkFinishUrl(fileMeta))
      })

    })

    describe('on progress', () => {

      it('should report progress', () => {
        const progress = sinon.spy()

        const { start, progress$ } = chunkUpload(file, config)
        start()

        progress$.subscribe(progress)

        const chunkTotal = fileMeta.fileSize / chunks.length
        server.requests[0].respond(200, {}, JSON.stringify(fileMeta))
        server.requests[1].upload.onprogress({ loaded: 1, total: chunkTotal })
        server.requests[1].upload.onprogress({ loaded: 2, total: chunkTotal })
        server.requests[1].upload.onprogress({ loaded: chunkTotal, total: chunkTotal })
        server.requests[1].respond(200)
        if (chunks.length > 1) {
          server.requests[2].upload.onprogress({ loaded: 2, total: chunkTotal })
          server.requests[2].upload.onprogress({ loaded: 3, total: chunkTotal })
          server.requests[2].upload.onprogress({ loaded: chunkTotal, total: chunkTotal })
          server.requests[2].respond(200)
        }
        server.respondImmediately = true
        server.respond()

        if (chunks.length > 1) {
          expect(progress.callCount).to.equal(6)
        } else {
          expect(progress.callCount).to.equal(3)
        }
        expect(progress.getCall(0).args[0]).to.equal(1 / fileMeta.fileSize)
        expect(progress.getCall(1).args[0]).to.equal(2 / fileMeta.fileSize)
        expect(progress.getCall(2).args[0]).to.equal(chunkTotal / fileMeta.fileSize)
        if (chunks.length > 1) {
          expect(progress.getCall(3).args[0]).to.equal((chunkTotal + 2) / fileMeta.fileSize)
          expect(progress.getCall(4).args[0]).to.equal((chunkTotal + 3) / fileMeta.fileSize)
          expect(progress.getCall(5).args[0]).to.equal(chunkTotal * 2 / fileMeta.fileSize)
        }
      })

    })

    describe('on complete', () => {

      it('should send completed fileMeta', () => {
        const complete = sinon.spy()

        const { start, complete$ } = chunkUpload(file, config)
        start()

        complete$.subscribe(complete)

        server.respondImmediately = true
        server.respond()

        expect(complete).calledOnce
        expect(complete.getCall(0).args[0]).to.eql(fileMeta)
      })

    })

    describe('uploadAllChunks', () => {

      let startChunkUploadStub
      let finishChunkUploadStub

      before(() => {
        const chunkUploadModule = require('../src/chunkUpload')
        startChunkUploadStub = sinon.stub(chunkUploadModule, 'startChunkUpload')
        startChunkUploadStub.returns(Observable.of(fileMeta))
        finishChunkUploadStub = sinon.stub(chunkUploadModule, 'finishChunkUpload')
        finishChunkUploadStub.returns(Observable.empty())
      })

      after(() => {
        startChunkUploadStub.restore()
        finishChunkUploadStub.restore()
      })

      it('should make request for each chunk url', () => {
        const { start } = chunkUpload(file, config)
        start()
        server.respondImmediately = true
        server.respond()
        expect(server.requests.length).to.equal(chunks.length)
        server.requests.forEach((r, i) => {
          expect(r.url).to.equal(config.getChunkUrl(fileMeta, i))
          expect(r.status).to.equal(200)
        })
      })

      it('should abort all chunk uploads', () => {
        const { start, abort } = chunkUpload(file, config)
        start()
        abort()

        server.respondImmediately = true
        server.respond()


        expect(server.requests.length).to.equal(Math.min(3, chunks.length))
        server.requests.forEach((request: any) => {
          expect(request.readyState).to.equal(0)
          expect(request.aborted).to.equal(true)
        })
      })

      if (chunks.length <= 3) {

        it('should pause and resume chunk upload', () => {
          const { start, pause, resume } = chunkUpload(file, config)
          start()

          const numbRequests = chunks.length
          expect(server.requests.length).to.equal(numbRequests)
          for (let i = 0; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(1)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          pause()


          expect(server.requests.length).to.equal(numbRequests)
          for (let i = 0; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          resume()

          expect(server.requests.length).to.equal(numbRequests * 2)
          for (let i = 0; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.respondImmediately = true
          server.respond()

          expect(server.requests.length).to.equal(numbRequests * 2)
          for (let i = 0; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
          for (let i = numbRequests; i < numbRequests; i++) {
            expect(server.requests[numbRequests + i].readyState).to.equal(4)
            expect(server.requests[numbRequests + i].status).to.equal(200)
            expect(server.requests[numbRequests + i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
        })

        it('should be able to retry after error', () => {
          const { start, retry } = chunkUpload(file, config)
          start()

          server.requests[0].respond(404)

          const numbRequests = chunks.length
          expect(server.requests.length).to.equal(numbRequests)

          expect(server.requests[0].readyState).to.equal(4)
          expect(server.requests[0].status).to.equal(404)
          expect(server.requests[0].url).to.equal(config.getChunkUrl(fileMeta, 0))
          for (let i = 1; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.respondImmediately = true
          server.respond()

          retry()

          expect(server.requests.length).to.equal(numbRequests * 2)
          for(let i = 0; i < numbRequests; i++) {
            expect(server.requests[numbRequests + i].url).to.equal(config.getChunkUrl(fileMeta, i))
            expect(server.requests[numbRequests + i].status).to.equal(200)
            expect(server.requests[numbRequests + i].readyState).to.equal(4)
          }
        })
      }

      if (chunks.length > 3) {

        it('should pause and resume chunk upload', () => {
          const { start, pause, resume } = chunkUpload(file, config)
          start()

          expect(server.requests.length).to.equal(Math.min(3, chunks.length))
          for (let i = 0; i < 3; i++) {
            expect(server.requests[i].readyState).to.equal(1)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.requests[0].respond()

          expect(server.requests.length).to.equal(4)
          expect(server.requests[0].readyState).to.equal(4)
          expect(server.requests[0].url).to.equal('/url0')
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i].readyState).to.equal(1)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          pause()

          expect(server.requests.length).to.equal(4)
          expect(server.requests[0].readyState).to.equal(4)
          expect(server.requests[0].url).to.equal('/url0')
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          resume()

          expect(server.requests.length).to.equal(7)
          expect(server.requests[0].readyState).to.equal(4)
          expect(server.requests[0].url).to.equal('/url0')
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i + 3].readyState).to.equal(1)
            expect(server.requests[i + 3].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.respondImmediately = true
          server.respond()

          expect(server.requests.length).to.equal(chunks.length + 3)
          expect(server.requests[0].readyState).to.equal(4)
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
          for (let i = 1; i < chunks.length; i++) {
            expect(server.requests[i + 3].readyState).to.equal(4)
            expect(server.requests[i + 3].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
        })

        it('should be able to retry after 3 errors', () => {
          const { start, retry } = chunkUpload(file, config)
          start()

          server.requests[0].respond(404)
          server.requests[1].respond(404)
          server.requests[2].respond(404)

          expect(server.requests.length).to.equal(5)
          for(let i = 0; i < 3; i++) {
            expect(server.requests[i].readyState).to.equal(4)
            expect(server.requests[i].status).to.equal(404)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
          for(let i = 3; i < 5; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.respondImmediately = true
          server.respond()

          retry()

          expect(server.requests.length).to.equal(chunks.length + 5)
          for(let i = 0; i < chunks.length; i++) {
            expect(server.requests[i + 5].url).to.equal(config.getChunkUrl(fileMeta, i))
            expect(server.requests[i + 5].status).to.equal(200)
            expect(server.requests[i + 5].readyState).to.equal(4)
          }
        })

      }

      it('should not pause, resume or retry after completion', () => {
          const { start, pause, resume, retry } = chunkUpload(file, config)
          start()

          pause()
          pause()
          pause()

          resume()
          resume()
          resume()

          server.respondImmediately = true
          server.respond()

          pause()
          pause()
          pause()

          resume()
          resume()
          resume()

          retry()
          retry()
          retry()

          if (chunks.length < 3) {
            expect(server.requests.length).to.equal(chunks.length * 2)
          } else {
            expect(server.requests.length).to.equal(chunks.length + 3)
          }
      })

      it.skip('should timeout requests', () => {
      })

      it.skip('should automatically retry failed requests by 3 times', () => {
      })

    })

  })

})
