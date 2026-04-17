import { Command, Option } from 'commander';
import { HostScope, HostType } from '@spwnr/core-types';
import { injectStatic } from '@spwnr/injector';
import { parseHostScope, parseHostType } from './host-options.js';

export function makeInjectCommand(): Command {
  const command = new Command('inject')
    .description('Inject a published agent package into a host')
    .argument('<name>', 'Package name')
    .argument('[version]', 'Version to inject (default: latest)', 'latest')
    .option('--target <dir>', 'Override target directory')
    .action(async (name: string, version: string, options: { host: string; scope: string; target?: string }) => {
      try {
        const result = await injectStatic({
          packageName: name,
          version,
          host: parseHostType(options.host),
          scope: parseHostScope(options.scope),
          ...(options.target ? { targetDir: options.target } : {}),
        });

        console.log(`✓ Injected ${name}@${result.version} into ${result.host}`);
        for (const file of result.files) {
          console.log(`  ${file.path}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`✗ Injection failed: ${msg}`);
        process.exit(1);
      }
    });

  command.addOption(new Option('--host <host>', 'Target host').choices(Object.values(HostType)).makeOptionMandatory());
  command.addOption(new Option('--scope <scope>', 'Injection scope').choices(Object.values(HostScope)).default(HostScope.PROJECT));
  return command;
}
