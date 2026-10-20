# Repository skills

These complete, unmodified upstream packages use the repository-scoped Agent Skills
layout: `.agents/skills/<name>/SKILL.md`. Supporting files and licenses remain
beside each entry point. These are ordinary tracked files, not submodules.

| Skill | Upstream revision | License |
| --- | --- | --- |
| [rpi-production-engineering](rpi-production-engineering/SKILL.md) | [dc3e9278e974c5507557b31a7868223d1a7dabd2](https://github.com/maxchichar/rpi-production-engineering/tree/dc3e9278e974c5507557b31a7868223d1a7dabd2) | Apache-2.0 |
| [interface-forge](interface-forge/SKILL.md) | [da70c1ca8869c10f0cf3e64ad90abf324a37da6a](https://github.com/maxchichar/interface-forge/tree/da70c1ca8869c10f0cf3e64ad90abf324a37da6a) | MIT |

Invoke `rpi-production-engineering` for engineering work or `interface-forge` for
UI/UX work. Reload the agent if it does not discover the skills immediately.
Installing these packages does not change the voting application or invoke an upgrade.

To update, review an explicit upstream revision, replace the corresponding complete
package while excluding its `.git` directory, update this table, and rerun its
README validation commands. Preserve upstream instructions and license files.

Known upstream validation issue: at the pinned RPI revision, `sha256sum -c
MANIFEST.sha256` fails for absent `.github/workflows/ci.yml` and `.gitignore`,
and outdated hashes for `LICENSE`, `README.md`, and `SKILL.md`. The same failure
occurs in the source checkout. The manifest is preserved unchanged; imported files
were independently compared byte-for-byte with the pinned source.
