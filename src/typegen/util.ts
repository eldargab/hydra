import path from 'path'
import fs from 'fs'
import Prettier from 'prettier'

const log = require('debug')('hydra-typegen:util')

export function readTemplate(template: string): string {
  return fs
    .readFileSync(path.join(__dirname, `../../resources/typegen/templates/${template}.hbs`))
    .toString()
}

export function readFile(source: string): string {
  const location = path.resolve(source)
  log(`Reading: ${location}`)
  return fs.readFileSync(location, 'utf-8')
}

export function readJson(source: string): Record<string, unknown> {
  return JSON.parse(readFile(source))
}

export function writeFile(dest: string, generator: () => string): void {
  log(`${dest}\n\tGenerating`)

  let generated = generator()

  while (generated.includes('\n\n\n')) {
    generated = generated.replace(/\n\n\n/g, '\n\n')
  }

  fs.writeFileSync(dest, generated)
}

const prettierOptions: Prettier.Options = {
  parser: 'typescript',
  endOfLine: 'auto',
}

export function formatWithPrettier(
  text: string,
  options: Prettier.Options = prettierOptions
): string {
  let formatted = ''
  try {
    formatted = Prettier.format(text, options)
  } catch (error) {
    console.error(
      'There were some errors while formatting with Prettier',
      error
    )
    formatted = text
  }
  return formatted
}

export type Key = string | number

export function pushToDictionary<V>(
  dict: Record<Key, V[]>,
  key: Key,
  ...values: V[]
): void {
  if (dict[key] === undefined) {
    dict[key] = [...values]
  } else {
    dict[key].push(...values)
  }
}

/**
 * replace all whitespaces and carriage returns
 *
 * @param s
 * @returns the same string with all whitecharacters removed
 */
export function compact(s: string): string {
  return s.replace(/\s/g, '')
}
