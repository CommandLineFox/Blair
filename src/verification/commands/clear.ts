import { Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Colors, EmbedBuilder, Guild, Message, MessageFlags, PermissionFlagsBits, TextChannel } from 'discord.js';
import { CustomResponse } from '../../types/customResponse';
import Database from '../../database/database';
import { logQuestioning } from '../../utils/utils';

export class ClearCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "clear",
            description: 'Removes a pending application',
            detailedDescription: "Removes a pending application",
            runIn: CommandOptionsRunTypeEnum.GuildText,
            requiredUserPermissions: [PermissionFlagsBits.Administrator],
            preconditions: ['UptimeCheck']
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName("user")
                        .setDescription("ID of user to remove the pending application of")
                        .setRequired(true)
                ),
            { idHints: ["1310732494290555033"] }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const userId = interaction.options.getString('user', true);

        const result = await this.removePendingApp(userId, interaction.guild!);
        await interaction.editReply({ content: result.message });
    }

    public override async messageRun(message: Message, args: Args): Promise<void> {
        const userId = await args.rest("string");

        if (!userId) {
            await message.reply("Couldn't find the argument");
            return;
        }

        const result = await this.removePendingApp(userId, message.guild!);
        await message.reply({ content: result.message });
    }

    private async removePendingApp(userId: string, guild: Guild): Promise<CustomResponse> {
        const database = Database.getInstance();

        const pendingApplication = await database.getPendingApplication(userId, guild.id);
        if (!pendingApplication) {
            return { success: false, message: "Couldn't find the pending application" };
        }

        if (pendingApplication.questioningChannelId) {
            const questioningChannel = await guild.channels.fetch(pendingApplication.questioningChannelId);
            if (!questioningChannel) {
                return { success: false, message: "Couldn't find the questioning channel" };
            }

            const questioningLogChannel = await database.getQuestioningLog(guild);
            if (!questioningLogChannel) {
                return { success: false, message: "Couldn't find the questioning log channel" };
            }

            const member = await guild.members.fetch(userId);
            if (!member) {
                return { success: false, message: "Couldn't find the guild member" };
            }

            await logQuestioning(questioningChannel as TextChannel, questioningLogChannel, member);
            await questioningChannel.delete("Cleaning verification");
        }

        if (pendingApplication.messageId) {
            const verificationLogChannel = await database.getVerificationLog(guild);
            if (!verificationLogChannel) {
                return { success: false, message: "Couldn't find the verification log channel" };
            }

            const verificationMessage = await verificationLogChannel.messages.fetch(pendingApplication.messageId);
            if (!verificationMessage) {
                return { success: false, message: "Couldn't find the verification message" };
            }

            const oldEmbed = verificationMessage.embeds[0];
            if (!oldEmbed) {
                return { success: false, message: "There was an error finding the embed." };
            }

            const newEmbed = new EmbedBuilder(oldEmbed.data)
                .setTitle(`${oldEmbed.title} | Cleared`)
                .setColor(Colors.Blue);

            await verificationMessage.edit({ content: verificationMessage.content, embeds: [newEmbed], components: [] });
        }

        return await database.removePendingApplication(userId, guild.id);
    }
}