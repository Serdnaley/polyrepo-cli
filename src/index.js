const fse = require('fs-extra')
const path = require('path')

const {
  reposTree,
  exampleRepo,
} = require('./tree')
const {
  rootFileName,
  log,
  setArgv,
  exec,
  isPromise,
  getRepoConditions,
  getFilteredRepos,
  findRoot,
} = require('./utils')

const cliRootPath = path.resolve(__dirname, '../')

const cliRepoUrl = 'ssh://git@gitlab.com:polyrepo/cli.git'

//
//   Handlers
//

const beforeEach = async (argv) => {
  setArgv(argv)
  return true
}

const showReposTree = async ({ root }) => {
  root = findRoot()
  log.infoTitle('Repos tree')

  console.log('Project root:', root)
  console.log(JSON.stringify(reposTree, null, 2))

  return true
}

const markAsRoot = async ({ root }) => {
  await fse.outputFile(path.resolve(root, rootFileName), 'This directory marked as project root')
  log.successTitle(`Marked as project root: ${root}`)
}

const cloneRepos = async ({ root, branch }) => {
  if (!findRoot(false)) {
    await markAsRoot({ root })
  }

  root = findRoot()
  log.infoTitle(`Cloning repos into ${root}`)

  let hasErrors = false
  for (const repo of getFilteredRepos()) {
    const cd = path.resolve(root, repo.uri)
    const params = branch ? ('--branch ' + branch) : ''
    await exec(`git clone "${repo.url}" "${cd}" ${params}`, { cwd: root })
      .then(() => log.success(`Cloned ${repo.url} into ${repo.uri}`))
      .catch(() => {
        log.errorTitle(`Failed cloning ${repo.url} into ${repo.uri}`)
        hasErrors = true
      })
  }

  return !hasErrors
}

const runCommand = async ({ cmd, root }) => {
  root = findRoot()
  log.infoTitle(`Running ${cmd}`)

  let hasErrors = false
  for (const repo of getFilteredRepos()) {
    log.info(`${repo.uri} $ ${cmd}`)
    await exec(cmd, { cwd: path.resolve(root, repo.uri) })
      .then(() => log.success(`Success running command ${cmd} for ${repo.uri}`))
      .catch(() => {
        log.errorTitle(`Failed running command ${cmd} for ${repo.uri}`)
        hasErrors = true
      })
  }

  return !hasErrors
}

const link = async ({ root }) => {
  root = findRoot()
  log.infoTitle('Linking shared modules')

  let hasErrors = false

  const link = async (repo, targetRepo) => {
    const repoPath = path.resolve(root, repo.uri)
    const targetPath = path.resolve(root, targetRepo.uri)
    const packagePath = `${repoPath}/node_modules/${targetRepo.package}`

    for (const dir of [repoPath, targetPath]) {
      if (!await fse.pathExists(dir)) {
        log.errorTitle(`Failed linking ${targetRepo.package} to ${repo.package}: Does not exists: ${dir}`)
        hasErrors = true
        return false
      }
    }

    await fse.remove(packagePath)
    await fse.ensureSymlink(targetPath, packagePath)

    return true
  }

  for (const repo of getFilteredRepos()) {
    for (const targetRepo of getFilteredRepos(repo.requires)) {
      await link(repo, targetRepo)
        .then((res) => res && log.success(`Linked in ${repo.uri} module @polyrepo/${targetRepo.name}`))
        .catch(() => {
          log.errorTitle(`Failed linking in ${repo.uri} module @polyrepo/${targetRepo.name}`)
          hasErrors = true
        })
    }
  }

  return !hasErrors
}

const installDependencies = async ({ root }) => {
  root = findRoot()
  log.infoTitle('Installing dependencies')

  let hasErrors = false
  for (const repo of getFilteredRepos()) {
    await exec(`yarn install`, { cwd: path.resolve(root, repo.uri) })
      .then(() => log.success(`Successfully installed dependencies for ${repo.uri}`))
      .catch(() => {
        log.errorTitle(`Failed installing dependencies for ${repo.uri}`)
        hasErrors = true
      })
  }

  return !hasErrors
}

const setup = async (argv) => {
  await cloneRepos(argv) && await installDependencies(argv) && await link(argv)
  return true
}

const update = async () => {
  log.infoTitle('Updating @polyrepo/cli')

  let hasErrors = false
  await exec(`npm i -g ${cliRepoUrl}`, { cwd: cliRootPath, stdio: 'inherit' })
    .then(() => log.success(`Successfully updated @polyrepo/cli`))
    .catch(() => {
      log.errorTitle(`Failed updating @polyrepo/cli`)
      hasErrors = true
    })

  return !hasErrors
}

const updateYarn = async ({ root }) => {
  root = findRoot()
  log.infoTitle('Updating yarn files')

  let hasErrors = false
  for (const repo of getFilteredRepos()) {
    await Promise.all([
      fse.remove(path.resolve(root, repo.uri, '.yarn')),
      fse.remove(path.resolve(root, repo.uri, '.yarnrc.yml')),
    ])
      .then(() => log.success(`Successfully removed old yarn files for ${repo.uri}`))
      .catch(() => {
        log.errorTitle(`Failed removing old yarn files for ${repo.uri}`)
        hasErrors = true
      })

    await Promise.all([
      fse.copy(path.resolve(cliRootPath, 'src/public/.yarn'), path.resolve(root, repo.uri, '.yarn'), { overwrite: true }),
      fse.copy(path.resolve(cliRootPath, 'src/public/.yarnrc.yml'), path.resolve(root, repo.uri, '.yarnrc.yml'), { overwrite: true }),
    ])
      .then(() => log.success(`Successfully updated yarn for ${repo.uri}`))
      .catch(() => {
        log.errorTitle(`Failed updating yarn for ${repo.uri}`)
        hasErrors = true
      })
  }

  return !hasErrors
}

//
//   CLI
//

const cli = require('yargs/yargs')(process.argv.slice(2))
cli.scriptName('polyrepo')
cli.usage('Usage: $0 <command> [options]')

cli.option('path', {
  alias: ['p', 'root'],
  type: 'string',
  describe: 'Path to working dir',
  requiresArg: false,
  default: process.cwd(),
  defaultDescription: 'process.cwd()',
})

cli.option('no-logs', {
  type: 'boolean',
  describe: 'Disable logs for child process',
  requiresArg: false,
  default: false,
})

cli.option('branch', {
  alias: 'b',
  type: 'string',
  describe: 'Target git branch for repos clone',
})

cli.option('only', {
  alias: 'o',
  type: 'array',
  describe: 'Run command only for listed repos, scope or side',
})
  .example('Available values for --only')
  .example(getRepoConditions(exampleRepo).join(' '))
  .example('')
  .example('$0 clone -o ui-client', 'Will clone only repos named ui-client')
  .example('$0 clone -o back', 'Will clone all repos from backend side')
  .example('$0 clone -o shared', 'Will clone all repos from shared scope')
  .example('$0 clone -o back+shared', 'Will clone all repos from backend shared scope')

cli.option('exclude', {
  alias: 'e',
  type: 'array',
  describe: 'Exclude some repos, scope or side',
})
  .example('Available values for --exclude')
  .example(getRepoConditions(exampleRepo).join(' '))
  .example('')
  .example('$0 clone -e ui-client', 'Will clone all repos without repo named ui-client')
  .example('$0 clone -e back', 'Will clone all repos without backend side')
  .example('$0 clone -e shared', 'Will clone all repos without shared scope')
  .example('$0 clone -e back+shared', 'Will clone all repos without backend shared scope')
  .example('$0 clone -o front -e ui-client', 'Will clone all repos in front without ui-client')

cli.command({
  command: 'mark',
  desc: 'Mark directory as project root',
  handler: (argv) => beforeEach(argv) && markAsRoot(argv),
})

cli.command({
  command: 'tree',
  aliases: ['tree', 'repos'],
  desc: 'Show repositories tree',
  handler: (argv) => beforeEach(argv) && showReposTree(argv),
})

cli.command({
  command: 'clone',
  desc: 'Clone all repos',
  handler: (argv) => beforeEach(argv) && cloneRepos(argv),
})

cli.command({
  command: 'run <cmd>',
  desc: 'Execute provided command for all repos',
  handler: (argv) => beforeEach(argv) && runCommand(argv),
})

cli.command({
  command: 'link',
  aliases: ['l', 'link'],
  desc: 'Link all dependencies in all repos',
  handler: (argv) => beforeEach(argv) && link(argv),
})

cli.command({
  command: 'install',
  aliases: ['i', 'install'],
  desc: 'Run yarn install for all repos',
  handler: (argv) => beforeEach(argv) && installDependencies(argv),
})

cli.command({
  command: 'setup',
  desc: 'Do clone, checkout, link, install',
  handler: (argv) => beforeEach(argv) && setup(argv),
})

cli.command({
  command: 'update',
  desc: 'Update @polyrepo/cli',
  handler: (argv) => beforeEach(argv) && update(argv),
})

cli.command({
  command: 'update-yarn',
  desc: 'Update @polyrepo/cli',
  handler: (argv) => beforeEach(argv) && updateYarn(argv),
})

cli.alias('v', 'version')
cli.help('h').alias('h', 'help')

;(async () => {
  const argv = cli.argv

  if (!isPromise(argv)) {
    console.log(await cli.getHelp())
    cli.exit(1)
  }
})()
