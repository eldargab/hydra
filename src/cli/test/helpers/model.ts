/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { WarthogModel, Field } from '../../model'
import * as PATH from "path"
import * as tmp from 'tmp'
import * as fs from 'fs-extra'
import { WarthogModelBuilder } from '../../parse/WarthogModelBuilder'

const threadObjType = {
  name: 'Thread',
  isEntity: true,
  isVariant: false,
  fields: [
    new Field('initial_body_text', 'String'),
    new Field('title', 'String'),
    new Field('id', 'ID'),
  ],
}

const postObjType = {
  name: 'Post',
  isEntity: true,
  isVariant: false,
  fields: [
    new Field('initial_body_text', 'String'),
    new Field('title', 'String'),
    new Field('id', 'ID'),
  ],
}

const createModel = (): WarthogModel => {
  const warthogModel = new WarthogModel()
  warthogModel.addEntity(threadObjType)
  warthogModel.addEntity(postObjType)
  return warthogModel
}

export function fromStringSchema(schema: string): WarthogModel {
  const tmpobj = tmp.fileSync()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  fs.writeSync(tmpobj.fd, schema)
  const modelBuilder = new WarthogModelBuilder(tmpobj.name)
  return modelBuilder.buildWarthogModel()
}

export { threadObjType, postObjType, createModel }

export function resource(name: string): string {
  return PATH.join(__dirname, '../../../../resources/cli', name)
}

export function readResource(name: string): string {
  return fs.readFileSync(resource(name), 'utf-8')
}
