import * as fs from 'fs-extra'
import * as path from 'path'
import { getTemplatePath, createFile, createDir } from '../utils'

import Debug from 'debug'
import { WarthogModel, ObjectType } from '../model'
import { FTSQueryRenderer } from './FTSQueryRenderer'
import { ModelRenderer } from './ModelRenderer'
import { EnumRenderer } from './EnumRenderer'
import { kebabCase } from './utils'
import { ConfigProvider } from './ConfigProvider'
import { VariantsRenderer } from './VariantsRenderer'
import { render } from './AbstractRenderer'
import { indexContext } from './model-index-context'
import { JsonFieldRenderer } from './JsonFieldRenderer'
import {
  ENUMS_FOLDER,
  VARIANTS_FOLDER,
  JSONFIELDS_FOLDER,
  QUERIES_FOLDER,
} from './constants'

const debug = Debug('qnode-cli:sources-generator')

/**
 * additional context to be passed to the generator,
 * e.g. to have predictable timestamps
 */
export interface GeneratorContext {
  [key: string]: unknown
}

export class SourcesGenerator {
  readonly config: ConfigProvider
  readonly model: WarthogModel
  dryRun = false

  constructor(model: WarthogModel) {
    this.config = new ConfigProvider()
    this.model = model
    this.dryRun = process.env.DRY_RUN === 'true'
  }

  generate(): void {
    this.generateEnums()
    this.generateVariants()
    this.generateModels()
    this.generateQueries()
    this.generateModelIndex()
    this.generateJsonFields()
  }

  generateModels(): void {
    createDir(path.resolve(process.cwd(), 'src/modules'), false, true)

    const typesAndInterfaces: ObjectType[] = [
      ...this.model.interfaces,
      ...this.model.entities,
    ]

    typesAndInterfaces.map((objType) => {
      const context = this.config.withGeneratedFolderRelPath(objType.name)
      const modelRenderer = new ModelRenderer(this.model, objType, context)
      const destFolder = this.config.getDestFolder(objType.name)
      createDir(path.resolve(process.cwd(), destFolder), false, true)

      const tempateFile: { [key: string]: string } = {
        model: 'entities/model.ts.mst',
        resolver: objType.isInterface
          ? 'interfaces/resolver.ts.mst'
          : 'entities/resolver.ts.mst',
        service: objType.isInterface
          ? 'interfaces/service.ts.mst'
          : 'entities/service.ts.mst',
      }

      ;['model', 'resolver', 'service'].map((template) => {
        const rendered = modelRenderer.render(
          this.readTemplate(tempateFile[template])
        )
        const destPath = path.join(
          destFolder,
          `${kebabCase(objType.name)}.${template}.ts`
        )
        this.writeFile(destPath, rendered)
      })
    })
  }

  generateQueries(): void {
    if (!this.model) {
      throw new Error('Warthog model is undefined')
    }

    // create migrations dir if not exists
    const migrationsDir = this.config.getMigrationsFolder()
    fs.ensureDirSync(path.resolve(process.cwd(), migrationsDir))

    // create dir if the textsearch module
    const ftsDir = this.config.getDestFolder(QUERIES_FOLDER)
    fs.ensureDirSync(path.resolve(process.cwd(), ftsDir))

    const queryRenderer = new FTSQueryRenderer()

    this.model.ftsQueries.map((query) => {
      const tempateFile = (name: string) =>
        this.readTemplate(`textsearch/${name}.ts.mst`)
      const destPath = {
        migration: path.join(migrationsDir, `${query.name}.migration.ts`),
        resolver: path.join(ftsDir, `${query.name}.resolver.ts`),
        service: path.join(ftsDir, `${query.name}.service.ts`),
      } as { [key: string]: string }

      ;['migration', 'resolver', 'service'].map((name) => {
        const rendered = queryRenderer.generate(tempateFile(name), query)
        debug(`Writing ${query.name} ${name} to ${destPath[name]}`)
        this.writeFile(destPath[name], rendered)
      })
    })
  }

  generateVariants(): void {
    if (!this.model.unions) {
      return
    }

    const unionDir = this.config.getDestFolder(VARIANTS_FOLDER)
    createDir(path.resolve(process.cwd(), unionDir), false, true)
    const renderer = new VariantsRenderer(this.model)
    const template = this.readTemplate('variants/variants.mst')
    this.writeFile(
      path.join(unionDir, 'variants.model.ts'),
      renderer.render(template)
    )
  }

  generateEnums(): void {
    if (!this.model.enums) {
      return
    }

    const enumsDir = this.config.getDestFolder(ENUMS_FOLDER)
    createDir(path.resolve(process.cwd(), enumsDir), false, true)

    const enumRenderer = new EnumRenderer(this.model)
    const rendered = enumRenderer.render(
      this.readTemplate('entities/enums.ts.mst')
    )
    this.writeFile(path.join(enumsDir, `enums.ts`), rendered)
  }

  generateJsonFields(): void {
    const [dir, tmplName] = JSONFIELDS_FOLDER

    const jsonFieldsDir = this.config.getDestFolder(dir)
    createDir(path.resolve(process.cwd(), jsonFieldsDir), false, true)

    this.writeFile(
      path.join(jsonFieldsDir, tmplName.slice(0, -4)),
      new JsonFieldRenderer(this.model).render(
        this.readTemplate(path.join(dir, tmplName))
      )
    )
  }

  generateModelIndex(): string {
    const rendered = render(
      this.readTemplate('entities/model-all.ts.mst'),
      indexContext(this.model)
    )
    if (!this.dryRun) {
      // create top-level /model folder
      const modelDir = path.join(this.config.config.get('ROOT_FOLDER'), 'model')
      createDir(modelDir, false, true)

      // write to /modul/index.ts
      this.writeFile(path.join(modelDir, 'index.ts'), rendered)
    }
    // return the result to simply testing
    return rendered
  }

  /**
   *
   * @param template - relative path to a template from the templates folder, e.g. 'db-helper.mst'
   * @param destPath - relative path to the `generated/graphql-server` folder, e.g. 'src/index.ts'
   * @param render - function which transforms the template contents
   */
  private renderAndWrite(
    template: string,
    destPath: string,
    render: (data: string) => string
  ) {
    const templateData: string = fs.readFileSync(
      getTemplatePath(template),
      'utf-8'
    )
    debug(`Source: ${getTemplatePath(template)}`)
    const rendered: string = render(templateData)

    debug(`Transformed: ${rendered}`)
    const destFullPath = path.resolve(process.cwd(), destPath)

    debug(`Writing to: ${destFullPath}`)
    createFile(destFullPath, rendered, true)
  }

  private readTemplate(relPath: string) {
    debug(`Reading template: ${relPath}`)
    return fs.readFileSync(getTemplatePath(relPath), 'utf-8')
  }

  private writeFile(destPath: string, data: string) {
    const destFullPath = path.resolve(process.cwd(), destPath)

    debug(`Writing to: ${destFullPath}`)
    createFile(destFullPath, data, true)
  }
}
