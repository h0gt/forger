import { getShardInfoFromGuild } from 'core/bot/bot';
import { Emoji } from 'core/emojis';
import {
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  ButtonStyles,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, TimestampStyle } from 'types/types';
import { hyperlink, emoji, timestamp } from 'utils/markdown';
import os from 'os';
import { MAINTENANCE } from 'core/variables';
import { toEmoji } from 'utils/utils';

createApplicationCommand({
  name: 'debug',
  description: 'View some statistics of the bot',
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Core,
    cooldown: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    // Shard information
    const shardInfo = await getShardInfoFromGuild(interaction.guildId);
    const shard = shardInfo.shardId;
    const latency = shardInfo.rtt === -1 ? 'N/A' : `${shardInfo.rtt.toLocaleString('en-US')}ms`;

    // System information
    const uptime = timestamp(Math.floor(Date.now() - process.uptime() * 1000), TimestampStyle.RelativeTime);
    const memory = process.memoryUsage();
    const usedMemory = memory.heapUsed;
    const totalMemory = memory.rss;
    const memoryUsage = `${Number((usedMemory / 1024 / 1024).toFixed(2)).toLocaleString('en-US')} MB (${Number((totalMemory / 1024 / 1024).toFixed(2)).toLocaleString('en-US')} MB)`;

    // Bot information
    const app = await bot.rest.getApplicationInfo();
    const guilds = app.approximateGuildCount?.toLocaleString('en-US') ?? 'N/A';
    const installs = app.approximateUserInstallCount?.toLocaleString('en-US') ?? 'N/A';

    const maintenance =
      MAINTENANCE.toLowerCase() === 'true' ? `\n${emoji('Warning')} The bot is currently under maintenance` : '';

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Forger is a bot for the Roblox game "The Forge," providing useful information anytime, anywhere!\nDeveloped by **${hyperlink('https://discord.gg/CAr2YgdtAv', 'Keystone')}**, designed by **${hyperlink('https://ko-fi.com/Mini_Min', 'Mini_Min>:3')}**, most emojis are from **${hyperlink('https://discord.gg/icons-859387663093727263', 'Icons')}**`,
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `### Shard #${shard}\n> Latency: **${latency}**\n> Uptime: **${uptime}**\n> Memory: **${memoryUsage}**\n> Guilds: **${guilds}**\n> Installs: **${installs}**${maintenance}`,
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.Button,
                  label: 'Invite Me!',
                  emoji: toEmoji('Link'),
                  url: `https://discord.com/oauth2/authorize?client_id=1461873695688491190`,
                  style: ButtonStyles.Link,
                },
                {
                  type: MessageComponentTypes.Button,
                  label: 'Support Server',
                  emoji: toEmoji('Discord'),
                  url: 'https://discord.gg/EEAchFSWpr',
                  style: ButtonStyles.Link,
                },
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
