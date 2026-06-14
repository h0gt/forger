import { commandOptionsParser, createLogger, InteractionTypes, MessageComponentTypes, MessageFlags } from 'discordeno';
import { check } from 'middlewares/cooldown';
import { codeblock, highlight, truncate, timestamp, emoji, hyperlink } from 'utils/markdown';
import {
  TimestampStyle,
  type Interaction,
  type CollectorType,
  type ApplicationCommand,
  ApplicationCommandCategory,
} from 'types/types';
import createEvent from 'helpers/event';
import { bot } from 'bot/bot';
import { PermissionManager } from 'middlewares/permission';
import { DEV_IDS, MAINTENANCE } from 'core/variables';
import { redis } from 'utils/redis';
import { SUPPORT_SERVER } from 'core/constants';
import { Emoji } from 'core/emojis';

export const collectors = new Set<CollectorType<Interaction>>();

const logger = createLogger({ name: 'interactionCreate' });

createEvent({
  name: 'interactionCreate',
  async run(interaction) {
    logger.info(
      `Received interactionCreate event: ${interaction.id} (${interaction.type}) from ${interaction.user.username}`,
    );

    if (!interaction.data) return;

    if (interaction.type === InteractionTypes.ApplicationCommand) {
      await handleApplicationCommand(interaction);
    } else if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
      await handleApplicationCommandAutocomplete(interaction);
    } else if ([InteractionTypes.MessageComponent, InteractionTypes.ModalSubmit].includes(interaction.type)) {
      for (const collector of collectors) {
        await collector.collect(interaction);
      }
    }
  },
});

async function handleApplicationCommand(interaction: Interaction) {
  if (!interaction.data) return;

  const blacklisted = await redis.sIsMember('blacklist:users', interaction.user.id.toString());
  if (blacklisted) {
    await interaction.respond({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${emoji('Wrong')} You have been blacklisted from using this bot. Appeal ${hyperlink(SUPPORT_SERVER, 'here')}.`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });

    return;
  }

  const command = bot.commands.get(interaction.data.name) as ApplicationCommand;
  if (!command) {
    await interaction.respond({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${emoji('Exclamation')} The command: ${highlight(interaction.data.name)} was not found.`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });

    return;
  }

  if (command.dev && !DEV_IDS.includes(interaction.user.id.toString())) return;

  if (
    MAINTENANCE.toLowerCase() === 'true' &&
    interaction.user.id !== BigInt('782946852278501407') &&
    command.details.category !== ApplicationCommandCategory.Core
  ) {
    await interaction.respond({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${emoji('Warning')} The bot is currently under maintenance.`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });

    return;
  }

  const incognito = Boolean(interaction.data.options?.find((option) => option.name === 'incognito')?.value);

  if (command.acknowledge) await interaction.defer(command.ephemeral || incognito);

  if (command.details.cooldown) {
    const result = check(interaction.user.id, command.name, command.details.cooldown);

    if (!result.executable) {
      if (command.acknowledge) {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${emoji('Exclamation')} You are on cooldown! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using ${highlight(`/${command.name}`)} again.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${emoji('Exclamation')} You are on cooldown! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using ${highlight(`/${command.name}`)} again.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      return;
    }
  }

  if (command.permissions) {
    if (!interaction.guildId) return;
    const guild = await bot.helpers.getGuild(interaction.guildId);
    if (!guild) return;

    if (!interaction.channelId) return;
    const channel = await bot.helpers.getChannel(interaction.channelId);
    if (!channel) return;

    const client = await bot.helpers.getMember(interaction.guildId, bot.id);
    if (!client) return;

    if (!interaction.member) return;
    const author = await bot.helpers.getMember(interaction.guildId, interaction.member.id);
    if (!author) return;

    const permissionManager = new PermissionManager(guild, channel, author, client, command.permissions);

    const { authorHasPerm, clientHasPerm, missingAuthorPerms, missingClientPerms } = permissionManager.check();

    if (!authorHasPerm) {
      if (command.acknowledge) {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${emoji('Exclamation')} You lack the following permissions: ${highlight(missingAuthorPerms.join(', '))} required to use this command.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${emoji('Exclamation')} You lack the following permissions: ${highlight(missingAuthorPerms.join(', '))} required to use this command.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      return;
    }

    if (!clientHasPerm) {
      if (command.acknowledge) {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${emoji('Exclamation')} I lack the following permissions: ${highlight(missingClientPerms.join(', '))} required to execute this command.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${emoji('Exclamation')} I lack the following permissions: ${highlight(missingClientPerms.join(', '))} required to execute this command.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      return;
    }
  }

  try {
    if (command.preconditions) {
      const context = {
        interaction,
        options: commandOptionsParser(interaction),
      };

      if (!(await command.preconditions.run(context))) {
        command.preconditions.fail(context);

        return;
      }
    }

    await command.run(bot, interaction, commandOptionsParser(interaction));
  } catch (e) {
    logger.error(`Command ${command.name} has errored.`, e);

    if (command.acknowledge) {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${emoji('Wrong')} The command: ${highlight(command.name)} has encountered an error. Please try again later.`,
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: codeblock('ts', e instanceof Error ? e.message : truncate(String(e), 1500)),
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `-# If you believe this is a bug, please report it to the developers by using </help:1467573209594597661>.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      await interaction.respond({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${emoji('Wrong')} The command: ${highlight(command.name)} has encountered an error. Please try again later.`,
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: codeblock('ts', e instanceof Error ? e.message : truncate(String(e), 1500)),
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `-# If you believe this is a bug, please report it to the developers by using </help:1467573209594597661>.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    return;
  }
}

async function handleApplicationCommandAutocomplete(interaction: Interaction) {
  if (!interaction.data) return;

  const command = bot.commands.get(interaction.data.name) as ApplicationCommand;
  if (!command) {
    await interaction.respond({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${emoji('Exclamation')} The command: ${highlight(interaction.data.name)} was not found.`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });

    return;
  }

  if (!command.autocomplete) return;

  await command.autocomplete(bot, interaction, commandOptionsParser(interaction));
}
