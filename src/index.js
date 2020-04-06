/* eslint-disable no-await-in-loop */
const fetch = require('node-fetch');
const { access } = require('libnpm');
const pacote = require('pacote');
const { keyBy } = require('lodash');
const diskMemo = require('./utils/diskMemo');

const getActiveFeCoManifests = diskMemo(async (orgName, token) => {
  const packages = await access
    .lsPackages(orgName, { token })
    .then(Object.keys);

  const fecoPackages = packages.filter((name) =>
    name.match(new RegExp(`^@${orgName}/fe-co-`)),
  );

  const activeFecoManifests = await Promise.all(
    fecoPackages.map((name) =>
      pacote.manifest(name, { token, fullMetadata: true }).catch(() => {}),
    ),
  ).then((list) => list.filter((manifest) => manifest && !manifest.deprecated));

  return activeFecoManifests;
});

const getRepos = diskMemo(async (orgName, token) => {
  let results = [];
  let done = false;
  let page = 0;
  while (!done) {
    const resp = await fetch(
      `https://api.github.com/orgs/${orgName}/repos?per_page=50&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${token}`,
        },
      },
    );

    results = [...results, ...(await resp.json())];
    done = !resp.headers.raw().link[0].match(/rel="next"/);
    page += 1;
  }
  return results;
});

/**
 * Query the list of packages in env.ORG_NAME
 * Then query which ones are fe-co-* and are not deprecated
 * Then matches against all repos in a GH org
 * and select the ones whose repo is archived
 */
(async () => {
  const orgName = process.env.ORG_NAME;
  const npmToken = process.env.NPM_TOKEN;
  const ghToken = process.env.GH_TOKEN;

  const activeCoManifests = await getActiveFeCoManifests(orgName, npmToken);
  console.log(`${activeCoManifests.length} active fe-co-* components`);

  // eslint-disable-next-line camelcase
  const reposByGitUrl = keyBy(await getRepos(orgName, ghToken), ({ git_url }) =>
    git_url.replace(/^git:\/\//, ''),
  );

  const packagesToArchive = activeCoManifests
    .filter((manifest) => {
      if (!manifest.repository || manifest.repository.type !== 'git') {
        return false;
      }
      const gitUrl = (manifest.repository.url.match(/github.com(.*)\.git/) ||
        [])[0];

      const repo = reposByGitUrl[gitUrl];
      return repo && repo.archived;
    })
    .map((manifest) => manifest.name);
  console.log('These packages should be archived');
  console.log(packagesToArchive);
})();
