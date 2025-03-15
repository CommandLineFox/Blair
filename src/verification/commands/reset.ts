import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import Database from '../../database/database';
import {Guild, Message, MessageFlags, PermissionFlagsBits, TextBasedChannel, TextChannel} from 'discord.js';

export class ResetCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'reset',
            description: 'Reset all configuration settings for the guild',
            detailedDescription: 'Completely removes all configuration settings for this guild from the database after confirmation.',
            runIn: CommandOptionsRunTypeEnum.GuildText,
            requiredUserPermissions: [PermissionFlagsBits.Administrator],
            preconditions: ['UptimeCheck'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
                builder.setName(this.name).setDescription(this.description),
            { idHints: [] }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild) {
            return;
        }
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (await this.awaitConfirmation(interaction.user.id, interaction.channel!)) {
            await this.resetGuild(interaction.guild);
            await interaction.editReply('All configuration settings for this guild have been reset.');
        } else {
            await interaction.editReply('Reset cancelled. No confirmation received.');
        }
    }

    public override async messageRun(message: Message): Promise<void> {
        if (!message.guild) {
            return;
        }

        if (await this.awaitConfirmation(message.author.id, message.channel)) {
            await this.resetGuild(message.guild);
            await message.reply('All configuration settings for this guild have been reset.');
        } else {
            await message.reply('Reset cancelled. No confirmation received.');
        }
    }

    private async awaitConfirmation(userId: string, channel: TextBasedChannel | null): Promise<boolean> {
        if (!channel) return false;
        if (channel !== channel as TextChannel) {
            return false;
        }

        await channel.send('This will **reset all configuration settings** for this guild. Type `confirm` to proceed, or wait 30 seconds to cancel.');

        try {
            const collected = await channel.awaitMessages({ filter: (msg) => msg.author.id === userId && msg.content.toLowerCase() === 'confirm', max: 1, time: 30_000, errors: ['time'], });

            return collected.size > 0;
        } catch {
            return false;
        }
    }

    private async resetGuild(guild: Guild): Promise<void> {
        await Database.getInstance().deleteGuild(guild.id);
    }
}