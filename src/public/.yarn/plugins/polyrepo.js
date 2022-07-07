const path = require('path')

const pattern = /^polyrepo\+/
const repoRoot = path.resolve(__dirname, '../../')

const useUtils = (require) => {
  const {
    execUtils,
    tgzUtils,
    structUtils,
    formatUtils,
    MessageName,
  } = require('@yarnpkg/core')
  const {
    ppath,
    xfs,
    CwdFS,
  } = require('@yarnpkg/fslib')

  const makeGitEnvironment = () => ({
    ...process.env,
    // An option passed to SSH by Git to prevent SSH from asking for data (which would cause installs to hang when the SSH keys are missing)
    GIT_SSH_COMMAND: `ssh -o BatchMode=yes`,
  })

  const parseRepoUrl = (url) => {
    const [, repo, hash] = url.match(/^polyrepo\+([^#]+)#?(.*)/)

    return {
      repo,
      hash: hash || process.env.BRANCH,
    }
  }

  const normalizeLocator = (locator) => {
    return structUtils.makeLocator(locator, locator.reference)
  }

  const useArchivator = (repo, hash) => {
    const project = repo.match(/^(?:polyrepo\+)?https?:\/\/gitlab.com\/(.*).git(?:#.*)?$/)[1]

    if (process.env.CI_JOB_TOKEN) {
      const endpoint = `https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/repository/archive.tar.gz?sha=${encodeURIComponent(hash)}`
      const cmd = ['curl', ['--header', `PRIVATE-TOKEN: ${process.env.CI_JOB_TOKEN}`, endpoint, '-o', 'archive.tar.gz']]

      return { endpoint, cmd, project }
    } else {
      const endpoint = `git@gitlab.com:${project}.git`
      const cmd = ['git', ['archive', hash, '--remote', endpoint, '--format', 'tar.gz', '--output', 'archive.tar.gz']]

      return { endpoint, cmd, project }
    }
  }

  const clone = async (url, opts) => {
    return await opts.project.configuration.getLimit('cloneConcurrency')(async () => {
      const { repo, hash = '' } = parseRepoUrl(url)

      const dir = await xfs.mktempPromise()
      const execOpts = {
        cwd: dir,
        env: makeGitEnvironment(),
        strict: true,
        stdio: 'inherit',
      }

      try {
        const archivePath = `${dir}/archive.tar.gz`

        const { cmd } = useArchivator(repo, hash)

        opts.report.reportInfo(MessageName.UNNAMED, `${dir} $ ${cmd}`)

        await execUtils.execvp(...cmd, execOpts)
        const sourceBuffer = await xfs.readFilePromise(archivePath);

        await tgzUtils.extractArchiveTo(sourceBuffer, new CwdFS(dir))
        await xfs.removePromise(archivePath)
      } catch (error) {
        if (error && error.message) error.message = `Repository clone failed: ${error.message}`
        throw error
      }

      return dir
    })
  }

  const clearCache = async (project, opts) => {
    for (const path of opts.cache.markedFiles) {
      if (
        path.startsWith(`${opts.cache.cwd}/@polyrepo-`) ||
        path.startsWith(`${opts.cache.cwd}/@shared`)
      ) {
        opts.report.reportInfo(MessageName.UNUSED_CACHE_ENTRY, `${formatUtils.pretty(project.configuration, ppath.basename(path), `magenta`)} appears to be unused - removing`)
        await xfs.removePromise(path)
      }
    }
  }

  return {
    pattern,
    makeGitEnvironment,
    parseRepoUrl,
    normalizeLocator,
    clone,
    clearCache,
  }
}

const useResolver = (require) => {
  const {
    miscUtils,
    structUtils,
    LinkType,
    Manifest
  } = require('@yarnpkg/core')

  const utils = useUtils(require)

  class Resolver {
    supportsDescriptor = (descriptor) => descriptor.range.match(utils.pattern)
    supportsLocator = (locator) => locator.reference.match(utils.pattern)
    shouldPersistResolution = () => true
    bindDescriptor = (descriptor) => descriptor
    getResolutionDependencies = () => []

    async getCandidates (descriptor) {
      const locator = structUtils.makeLocator(descriptor, descriptor.range)

      return [locator]
    }

    getSatisfying = async () => null

    async resolve(locator, opts) {
      if (!opts.fetchOptions)
        throw new Error(`Assertion failed: This resolver cannot be used unless a fetcher is configured`)

      const packageFetch = await opts.fetchOptions.fetcher.fetch(locator, opts.fetchOptions)

      const manifest = await miscUtils.releaseAfterUseAsync(async () => {
        return await Manifest.find(packageFetch.prefixPath, {baseFs: packageFetch.packageFs})
      }, packageFetch.releaseFs)

      return {
        ...locator,

        version: manifest.version || `0.0.0`,

        languageName: manifest.languageName || opts.project.configuration.get(`defaultLanguageName`),
        linkType: LinkType.HARD,

        dependencies: manifest.dependencies,
        peerDependencies: manifest.peerDependencies,

        dependenciesMeta: manifest.dependenciesMeta,
        peerDependenciesMeta: manifest.peerDependenciesMeta,

        bin: manifest.bin,
      }
    }
  }

  return { Resolver }
}

const useFetcher = (require) => {
  const {
    miscUtils,
    scriptUtils,
    structUtils,
    tgzUtils
  } = require('@yarnpkg/core')
  const { ppath, xfs } = require('@yarnpkg/fslib')

  const utils = useUtils(require)

  class Fetcher {
    supports = (locator) => locator.reference.match(utils.pattern)
    getLocalPath = () => null

    async fetch (locator, opts) {
      const normalizedLocator = utils.normalizeLocator(locator)

      const [packageFs, releaseFs] = await opts.cache.fetchPackageFromCache(locator, null, {
        onHit: () => opts.report.reportCacheHit(locator),
        onMiss: () => opts.report.reportCacheMiss(locator, `${structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be fetched from the remote repository`),
        loader: () => this.cloneFromRemote(normalizedLocator, opts),
        skipIntegrityCheck: opts.skipIntegrityCheck,
      })

      return {
        packageFs,
        releaseFs,
        prefixPath: structUtils.getIdentVendorPath(locator),
      }
    }

    async cloneFromRemote (locator, opts) {
      const cloneTarget = await utils.clone(locator.reference, opts)

      const packagePath = ppath.join(cloneTarget, `package.tgz`)

      await scriptUtils.prepareExternalProject(cloneTarget, packagePath, {
        configuration: opts.project.configuration,
        report: opts.report,
        locator,
      })

      const sourceBuffer = await xfs.readFilePromise(packagePath)

      return await miscUtils.releaseAfterUseAsync(async () => {
        return await tgzUtils.convertToZip(sourceBuffer, {
          compressionLevel: opts.project.configuration.get(`compressionLevel`),
          prefixPath: structUtils.getIdentVendorPath(locator),
          stripComponents: 1,
        })
      })
    }
  }

  return { Fetcher }
}

module.exports = {
  name: 'polyrepo',
  factory: async (require) => {
    const { execUtils } = require('@yarnpkg/core')

    const { Resolver } = useResolver(require)
    const { Fetcher } = useFetcher(require)
    const { clearCache, makeGitEnvironment } = useUtils(require)

    const getBranch = async () => {
      try {
        const res = await execUtils.execvp(
          'git',
          ['rev-parse', '--abbrev-ref', 'HEAD'],
          {
            cwd: repoRoot,
            env: makeGitEnvironment(),
            strict: true,
            stdio: 'inherit',
          },
        )

        return res.stdout.toString().trim()
      } catch (e) {
        throw e
      }
    }

    process.env.BRANCH = process.env.BRANCH || process.env.CI_COMMIT_REF_NAME || await getBranch()

    return {
      resolvers: [Resolver],
      fetchers: [Fetcher],
      modules: [],
      hooks: {
        async setupScriptEnvironment (project, env) {
          env.BRANCH = env.BRANCH || env.CI_COMMIT_REF_NAME || await getBranch()
        },
        async afterAllInstalled (project, opts) {
          await opts.report.startTimerPromise('polyrepo cache cleanup', async () => {
            await clearCache(project, opts)
          })
        },
      },
    }
  },
}
