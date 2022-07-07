# Polyrepo CLI

CLI Tool for polyrepos. Includes commands for: 
- Manage polyrepo dependencies with yarn custom plugin
- Full setup local version of polyrepo from ground with 1 command
- Execute command on specific repositories (with matches)
- Self-updating

## Commands
| Command                | Description                                              |
|------------------------|----------------------------------------------------------|
| `polyrepo mark`        | Mark directory as project root                           |
| `polyrepo tree`        | Show repositories tree            [aliases: tree, repos] |
| `polyrepo clone`       | Clone all repos                                          |
| `polyrepo run <cmd>`   | Execute provided command for all repos                   |
| `polyrepo link`        | Link all dependencies in all repos    [aliases: l, link] |
| `polyrepo install`     | Run yarn install for all repos     [aliases: i, install] |
| `polyrepo setup`       | Do clone, checkout, link, install                        |
| `polyrepo update`      | Update @polyrepo/cli                                     |
| `polyrepo update-yarn` | Update @polyrepo/cli                                     |

## Options
| Option               | Description                                                |
|----------------------|------------------------------------------------------------|
| `-p, --path, --root` | Path to working dir      [string] [default: process.cwd()] |
| `--no-logs`          | Disable logs for child process  [boolean] [default: false] |
| `-b, --branch`       | Target git branch for repos clone                 [string] |
| `-o, --only`         | Run command only for listed repos, scope or side   [array] |
| `-e, --exclude`      | Exclude some repos, scope or side                  [array] |
| `-h, --help`         | Show help                                        [boolean] |
| `-v, --version`      | Show version number                              [boolean] |

## Examples:
### Available values for `--only`:<br>
`<name>` `name:<name>` `<side>` `side:<side>` `<scope>` `scope:<scope>` `<uri>` `uri:<uri>` `<url>` `url:<url>`

| Example                         | Description                                    |
|---------------------------------|------------------------------------------------|
| `polyrepo clone -o ui-client`   | Will clone only repos named ui-client          |
| `polyrepo clone -o back`        | Will clone all repos from backend side         |
| `polyrepo clone -o shared`      | Will clone all repos from shared scope         |
| `polyrepo clone -o back+shared` | Will clone all repos from backend shared scope |

### Available values for `--exclude`:<br>
`<name>` `name:<name>` `<side>` `side:<side>` `<scope>` `scope:<scope>` `<uri>` `uri:<uri>` `<url>` `url:<url>`

| Example                              | Description                                         |
|--------------------------------------|-----------------------------------------------------|
| polyrepo clone -e ui-client          | Will clone all repos without repo named ui-client   |
| polyrepo clone -e back               | Will clone all repos without backend side           |
| polyrepo clone -e shared             | Will clone all repos without shared scope           |
| polyrepo clone -e back+shared        | Will clone all repos without backend shared scope   |
| polyrepo clone -o front -e ui-client | Will clone all repos in front but without ui-client |

