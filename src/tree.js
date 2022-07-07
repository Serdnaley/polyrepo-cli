const reposTree = {
  front: {
    modules: {
      'ui-admin': {
        package: '@polyrepo/ui-admin',
        url: 'git+ssh://git@gitlab.com/polyrepo/ui-admin.git',
        requires: ['name:shared-ui'],
      },
      'ui-financier': {
        package: '@polyrepo/ui-financier',
        url: 'git+ssh://git@gitlab.com/polyrepo/ui-financier.git',
        requires: ['name:shared-ui'],
      },
      'ui-partner': {
        package: '@polyrepo/ui-partner',
        url: 'git+ssh://git@gitlab.com/polyrepo/ui-partner.git',
        requires: ['name:shared-ui'],
      },
      'ui-manager': {
        package: '@polyrepo/ui-manager',
        url: 'git+ssh://git@gitlab.com/polyrepo/ui-manager.git',
        requires: ['name:shared-ui'],
      },
      'ui-curator': {
        package: '@polyrepo/ui-curator',
        url: 'git+ssh://git@gitlab.com/polyrepo/ui-curator.git',
        requires: ['name:shared-ui'],
      },
      'ui-operator': {
        package: '@polyrepo/ui-operator',
        url: 'git+ssh://git@gitlab.com/polyrepo/ui-operator.git',
        requires: ['name:shared-ui'],
      },
      'ui-client': {
        package: '@polyrepo/ui-client',
        url: 'git+ssh://git@gitlab.com/polyrepo/ui-client.git',
        requires: ['name:shared-ui'],
      },
    },
    shared: {
      'shared-ui': {
        package: '@shared',
        url: 'git+ssh://git@gitlab.com/polyrepo/ui-shared.git',
      },
    },
  },
  back: {
    modules: {
      'api-gateway': {
        package: '@polyrepo/api-gateway',
        url: 'git+ssh://git@gitlab.com/polyrepo/api-gateway.git',
        requires: ['name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
/*/
      'api-service-admin': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-admin.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-auth': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-auth.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-billing': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-billing.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-chat': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-chat.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-client': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-client.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-curator': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-curator.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-financier': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-financier.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-manager': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-manager.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-operator': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-operator.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
      'api-service-partner': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/api-service-partner.git',
        requires: ['name:shared-api', 'name:shared-db-billing', 'name:shared-db-chat', 'name:shared-db-content', 'name:shared-db-main'],
      },
/*/
    },
    shared: {
/*/
      'shared-api': {
        url: 'git+ssh://git@gitlab.com/polyrepo/back/shared-api.git',
      },
/*/
      'shared-db-billing': {
        package: '@polyrepo/shared-db-billing',
        url: 'git+ssh://git@gitlab.com/polyrepo/api-shared-billing-library.git',
      },
      'shared-db-chat': {
        package: '@polyrepo/shared-db-chat',
        url: 'git+ssh://git@gitlab.com/polyrepo/api-shared-chat-library.git',
      },
      'shared-db-content': {
        package: '@polyrepo/shared-db-content',
        url: 'git+ssh://git@gitlab.com/polyrepo/api-shared-content-library.git',
      },
      'shared-db-main': {
        package: '@polyrepo/shared-db-main',
        url: 'git+ssh://git@gitlab.com/polyrepo/api-shared-main-library.git',
      },
    },
  }
}

const exampleRepo = {
  name: '<name>',
  side: '<side>',
  scope: '<scope>',
  uri: '<uri>',
  url: '<url>',
}

const repos = []

for (const side of Object.keys(reposTree)) {
  for (const scope of Object.keys(reposTree[side])) {
    for (const name of Object.keys(reposTree[side][scope])) {
      const repo = reposTree[side][scope][name]
      const uri = [side, scope, name].join('/')
      repos.push({
        side, scope, name, uri,
        package: repo.package,
        url: repo.url,
        requires: repo.requires || [],
      })
    }
  }
}

module.exports = {
  exampleRepo,
  reposTree,
  repos,
}
