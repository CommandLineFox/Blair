import { Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import Database from 'database/database';
import { AttachmentBuilder, Colors, CommandInteraction, EmbedBuilder, Guild, Message, PermissionFlagsBits, TextChannel, User } from 'discord.js';
import { CustomResponse } from 'types/customResponse';

export class DenyCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'approve',
            description: 'Approve a user during questioning',
            runIn: CommandOptionsRunTypeEnum.GuildText
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName("action")
                        .addChoices([{ name: "kick", value: "kick" }, { name: "ban", value: "ban" }]))
        );
    }
    public override async chatInputRun(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) {
            await interaction.reply({ content: "Invalid interaction", ephemeral: true });
            return;
        }

        const action = interaction.options.getString('action');
        if (!['kick', 'ban'].includes(action!)) {
            await interaction.reply({ content: 'Invalid action. Choose either "kick" or "ban".', ephemeral: true });
            return;
        }

        const result = await this.denyUser(interaction.guild!, interaction.channel!.id, interaction.user, action!);
        await interaction.reply({ content: result.message });
    }

    public override async messageRun(message: Message, args: Args) {
        const action = await args.rest("string");

        if (!action) {
            await message.reply("Couldn't find the argument");
            return;
        }

        if (!['kick', 'ban'].includes(action)) {
            await message.reply('Invalid action. Choose either "kick" or "ban".');
            return;
        }

        const result = await this.denyUser(message.guild!, message.channel.id, message.author, action);
        await message.reply({ content: result.message });
    }

    private async denyUser(guild: Guild, channelId: string, staffMember: User, action: string): Promise<CustomResponse> {
        const database = Database.getInstance();

        const pendingApplication = await database.getPendingApplicationFromQuestioningChannel(channelId);
        if (!pendingApplication) {
            return { success: false, message: "Couldn't find the pending application" };
        }

        const questioningChannel = await guild.channels.fetch(channelId);
        if (!questioningChannel) {
            return { success: false, message: "Couldn't find the questioning channel" };
        }

        const verificationLogChannel = await database.getVerificationLog(guild);
        if (!verificationLogChannel) {
            return { success: false, message: "Couldn't find the verification log channel" };
        }

        if (!pendingApplication.messageId) {
            return { success: false, message: "Couldn't find the message ID for the message in the verification log channel" };
        }

        const verificationMessage = await verificationLogChannel.messages.fetch(pendingApplication.messageId);
        if (!verificationMessage) {
            return { success: false, message: "Couldn't find the message in the channel" };
        }

        const questioningLogChannel = await database.getQuestioningLog(guild);
        if (!questioningLogChannel) {
            return { success: false, message: "Couldn't find the questioning log channel" };
        }

        const permissionsLogging = questioningLogChannel.permissionsFor(staffMember);
        if (!permissionsLogging?.has(PermissionFlagsBits.SendMessages | PermissionFlagsBits.AttachFiles)) {
            return { success: false, message: "The bot doesn't have the send messages or attach files permission in the questioning log channel" };
        }

        const permissionsDeleting = questioningChannel.permissionsFor(staffMember);
        if (!permissionsDeleting?.has(PermissionFlagsBits.ManageChannels)) {
            return { success: false, message: "The bot doesn't have the permission to delete the questioning channel" };
        }









        const member = await guild.members.fetch(pendingApplication.userId);
        if (!member) {
            return { success: false, message: "Couldn't find the member." };
        }

        const oldEmbed = verificationMessage.embeds[0];
        if (!oldEmbed) {
            return { success: false, message: "There was an error finding the embed." };
        }


        if (action === "kick") {
            const permissions = questioningChannel.permissionsFor(staffMember);
            if (!permissions?.has(PermissionFlagsBits.KickMembers)) {
                return { success: false, message: "The bot doesn't have the kick members permission in that channel" };
            }

            if (!member.kickable) {
                return { success: false, message: "The bot cannot moderate this user as they have the same or higher role than the bot" };
            }

            await member.kick("Kicked during verification");
        } else {

            const permissions = questioningChannel.permissionsFor(staffMember);
            if (!permissions?.has(PermissionFlagsBits.BanMembers)) {
                return { success: false, message: "The bot doesn't have the ban members permission in that channel" };
            }

            if (!member.bannable) {
                return { success: false, message: "The bot cannot moderate this user as they have the same or higher role than the bot" };
            }

            await member.ban({ reason: "Banned during verification" });
        }

        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setColor(Colors.Red)
            .addFields({ name: "Handled by", value: `${staffMember.username} (${staffMember.id})` });


        await verificationMessage.edit({ embeds: [newEmbed], components: [] });

        const messages = await (questioningChannel as TextChannel).messages.fetch();
        const logs = messages.reduce((log, msg) => log + `${msg.author.tag}: ${msg.content}\n`, '');
        const logBuffer = Buffer.from(logs, 'utf-8');

        await questioningLogChannel.send({
            content: `Logs from the questioning channel for ${member.user.username} (${member.user.id}):`,
            files: [new AttachmentBuilder(logBuffer, { name: 'questioning_log.txt' })]
        });

        await database.removePendingApplication(member.id, guild.id);
        return { success: true, message: "Successfully approved the user" };
    }
}