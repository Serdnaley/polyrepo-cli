const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const _ = require('lodash')

const { repos } = require('./tree')

const childProcess = require('child_process')
childProcess.spawn = require('cross-spawn')

const log = (style, text) => console.log(style(`>>> ${text} `))

log.infoTitle = (text) => log(chalk.bgBlue.whiteBright, text)
log.info = (text) => log(chalk.blue, text)
log.successTitle = (text) => log(chalk.bgGreenBright.black, text)
log.success = (text) => log(chalk.green, text)
log.errorTitle = (text) => log(chalk.bgRedBright.whiteBright, text)
log.error = (text) => log(chalk.red, text)

let argv = null
const setArgv = (val) => argv = val

const exec = async (command, options = {}) => {
  if (!argv['no-logs']) options.stdio = 'inherit'

  return childProcess.execSync(
    command,
    _.merge({ env: process.env, cwd: process.cwd() }, options),
  )
}

const isPromise = v => typeof v === 'object' && typeof v.then === 'function'

const getRepoConditions = (repo) => _(repo).keys().flatMap((key) => [repo[key], `${key}:${repo[key]}`]).value()
const matchRepoLabels = (repo, labels) => {
  if (!labels) return false
  for (const labelsGroup of labels) {
    const repoLabels = getRepoConditions(repo)
    const isExcluded = _.every(labelsGroup.split(/[+&]/), (condition) => repoLabels.includes(condition))
    if (isExcluded) return true
  }
  return false
}

const getFilteredRepos = (only = argv.only, exclude = argv.exclude) => {
  return repos
    .filter((repo) => !only || matchRepoLabels(repo, only))
    .filter((repo) => !matchRepoLabels(repo, exclude))
}

const rootFileName = '.polyrepo'
const isRoot = (path) => fs.existsSync(`${path}/${rootFileName}`)
const findRoot = (required = true) => {
  const rootParts = path.resolve(__dirname, argv.root).split(/[\\\/]/)

  while (rootParts.length) {
    if (isRoot(rootParts.join('/'))) {
      log.infoTitle('Project root detected:')
      log.info(rootParts.join('/'))
      return argv.root = rootParts.join('/')
    }
    rootParts.pop()
  }

  log.errorTitle(`Project root is not found in ${argv.root} and above`)
  if (required) process.exit(1)
}

module.exports = {
  rootFileName,
  log,
  setArgv,
  exec,
  isPromise,
  getRepoConditions,
  getFilteredRepos,
  findRoot,
}
