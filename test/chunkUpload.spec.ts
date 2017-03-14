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

const chunks = Array.apply(null, Array(10)).map((i: number) => {
  return 'chunk ' + i
})

const fileMeta: any = {
  fileSize: 1000,
  fileKey: 'fileKey',
  chunks: 10
}

describe('chunkUpload', () => {

  const file = createMockFile('file', 'test.txt')

  let server

  beforeEach(() => {
    server = sinon.fakeServer.create()
    chunks.forEach((_: Blob, i: number) => {
      const chunkUrl = config.getChunkUrl(fileMeta, i)
      server.respondWith('POST', chunkUrl, [200, {}, ''])
    })
    server.respondWith('POST', config.getChunkStartUrl(), [200, {}, JSON.stringify(fileMeta)])
    server.respondWith('POST', config.getChunkFinishUrl(fileMeta), [200, {}, ''])
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
    for (let i = 1; i < 11; i++) {
      expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i - 1))
      expect(server.requests[i].status).to.equal(200)
    }
    expect(server.requests[11].url).to.equal(config.getChunkFinishUrl(fileMeta))
    expect(server.requests[11].status).to.equal(200)

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

    it('should make request for each chunk url', () => {
      const { start } = chunkUpload(file, config)
      start()
      server.respondImmediately = true
      server.respond()
      expect(server.requests.length).to.equal(10)
      server.requests.forEach((r, i) => {
        expect(r.url).to.equal(config.getChunkUrl(fileMeta, i))
        expect(r.status).to.equal(200)
      })
    })

    it('should report progress', () => {
      const onProgress = sinon.spy()

      const { start } = chunkUpload(file, { ...config, onProgress })
      start()

      server.requests[0].upload.onprogress({ total: fileMeta.fileSize, loaded: 100 })
      server.requests[1].upload.onprogress({ total: fileMeta.fileSize, loaded: 200 })
      server.respondImmediately = true
      server.respond()

      expect(onProgress).to.be.calledTwice
      expect(onProgress.getCall(0).args[0]).to.equal(0.1)
      expect(onProgress.getCall(1).args[0]).to.equal(0.3)
    })

    it('should abort all chunk uploads', () => {
      const onSuccess = sinon.spy()

      const { start, abort } = chunkUpload(file, config)
      start()
      abort()

      server.respondImmediately = true
      server.respond()


      expect(server.requests.length).to.equal(3)
      server.requests.forEach((request: any) => {
        expect(request.readyState).to.equal(0)
        expect(request.aborted).to.equal(true)
      })
      expect(onSuccess).not.to.be.called
    })

    it('should pause and resume chunk upload', () => {
      const onSuccess = sinon.spy()
      const { start, pause, resume } = chunkUpload(file, config)
      start()

      expect(server.requests.length).to.equal(3)
      expect(server.requests[0].readyState).to.equal(1)
      expect(server.requests[0].url).to.equal('/url0')
      expect(server.requests[1].readyState).to.equal(1)
      expect(server.requests[1].url).to.equal('/url1')
      expect(server.requests[2].readyState).to.equal(1)
      expect(server.requests[2].url).to.equal('/url2')

      server.requests[0].respond()

      expect(server.requests.length).to.equal(4)
      expect(server.requests[0].readyState).to.equal(4)
      expect(server.requests[0].url).to.equal('/url0')
      expect(server.requests[1].readyState).to.equal(1)
      expect(server.requests[1].url).to.equal('/url1')
      expect(server.requests[2].readyState).to.equal(1)
      expect(server.requests[2].url).to.equal('/url2')
      expect(server.requests[3].readyState).to.equal(1)
      expect(server.requests[3].url).to.equal('/url3')

      pause()

      expect(server.requests.length).to.equal(4)
      expect(server.requests[0].readyState).to.equal(4)
      expect(server.requests[0].url).to.equal('/url0')
      expect(server.requests[1].readyState).to.equal(0)
      expect(server.requests[1].url).to.equal('/url1')
      expect(server.requests[2].readyState).to.equal(0)
      expect(server.requests[2].url).to.equal('/url2')
      expect(server.requests[3].readyState).to.equal(0)
      expect(server.requests[3].url).to.equal('/url3')

      resume()

      expect(server.requests.length).to.equal(7)
      expect(server.requests[0].readyState).to.equal(4)
      expect(server.requests[0].url).to.equal('/url0')
      expect(server.requests[1].readyState).to.equal(0)
      expect(server.requests[1].url).to.equal('/url1')
      expect(server.requests[2].readyState).to.equal(0)
      expect(server.requests[2].url).to.equal('/url2')
      expect(server.requests[3].readyState).to.equal(0)
      expect(server.requests[3].url).to.equal('/url3')

      expect(server.requests[4].readyState).to.equal(1)
      expect(server.requests[4].url).to.equal('/url1')
      expect(server.requests[5].readyState).to.equal(1)
      expect(server.requests[5].url).to.equal('/url2')
      expect(server.requests[6].readyState).to.equal(1)
      expect(server.requests[6].url).to.equal('/url3')

      server.respondImmediately = true
      server.respond()

      expect(server.requests.length).to.equal(13)
      expect(server.requests[0].readyState).to.equal(4)
      expect(server.requests[0].url).to.equal('/url0')
      expect(server.requests[1].readyState).to.equal(0)
      expect(server.requests[1].url).to.equal('/url1')
      expect(server.requests[2].readyState).to.equal(0)
      expect(server.requests[2].url).to.equal('/url2')
      expect(server.requests[3].readyState).to.equal(0)
      expect(server.requests[3].url).to.equal('/url3')
      for (let i = 4; i < server.requests.length; i++) {
        expect(server.requests[i].readyState).to.equal(4)
        expect(server.requests[i].url).to.equal('/url' + (i - 3))
      }
    })

    it.skip('should call onError when upload completes but some of the chunk errors', () => {
      const onError = sinon.spy()
      const onSuccess = sinon.spy()

      const { start } = chunkUpload(file, config)

      server.respondImmediately = true
      server.requests[0].respond(400)
      server.respond()

      expect(onSuccess).not.to.be.called
      // expect(onError).to.be.calledOnce
    })

    it('should be able to retry after 3 errors', () => {
      const onSuccess = sinon.spy()
      const onError = sinon.spy()

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
      expect(onSuccess).not.to.be.called

      server.respondImmediately = true
      server.respond()

      retry()

      expect(server.requests.length).to.equal(15)
      for(let i = 5; i < server.requests.length; i++) {
        expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i - 5))
        expect(server.requests[i].status).to.equal(200)
        expect(server.requests[i].readyState).to.equal(4)
      }

      // expect(onSuccess).to.be.calledOnce
      // expect(onError).to.be.calledOnce
    })

    it.skip('should timeout requests', () => {
    })

    it.skip('should automatically retry failed requests by 3 times', () => {
    })

  })

})
