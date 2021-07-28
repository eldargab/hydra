declare module 'warthog/dist/cli/cli' {
  function run(cmd: string[]): Promise<void>
}