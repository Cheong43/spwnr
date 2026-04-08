import { Command, Option } from 'commander';
import { HostScope, HostType } from '@spwnr/core-types';
import { composeSession } from '@spwnr/injector';

export function makeSessionCommand(): Command {
  const command = new Command('session')
    .description('Compose a host session descriptor for a published agent package')
    .argument('<name>', 'Package name')
    .argument('[version]', 'Version to load (default: latest)', 'latest')
    .action(async (name: string, version: string, options: { host: string; scope: string; format: 'json' | 'shell' }) => {
      try {
        const result = await composeSession({
          packageName: name,
          version,
          host: options.host as typeof HostType[keyof typeof HostType],
          scope: options.scope as typeof HostScope[keyof typeof HostScope],
          format: options.format,
        });

        for (const warning of result.warnings) {
          console.error(`! ${warning}`);
        }
        process.stdout.write(result.content);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`✗ Session composition failed: ${msg}`);
        process.exit(1);
      }
    });

  command.addOption(new Option('--host <host>', 'Target host').choices(Object.values(HostType)).makeOptionMandatory());
  command.addOption(new Option('--scope <scope>', 'Session scope').choices(Object.values(HostScope)).default(HostScope.PROJECT));
  command.addOption(new Option('--format <format>', 'Output format').choices(['json', 'shell']).default('json'));
  return command;
}
