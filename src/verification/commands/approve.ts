import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import Database from 'database/database';
import { AttachmentBuilder, Colors, CommandInteraction, EmbedBuilder, Guild, Message, PermissionFlagsBits, TextChannel, User } from 'discord.js';
import { CustomResponse } from 'types/customResponse';

export class ApproveCommand extends Command {
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
        );
    }

    public override async chatInputRun(interaction: CommandInteraction) {
        const result = await this.approveUser(interaction.guild!, interaction.channel!.id, interaction.user);
        interaction.reply({ content: result.message });
    }

    public override async messageRun(message: Message) {
        const result = await this.approveUser(message.guild!, message.channel.id, message.author);
        message.reply({ content: result.message });
    }

    private async approveUser(guild: Guild, channelId: string, staffMember: User): Promise<CustomResponse> {
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

        if (pendingApplication.requiredApprovers.length > 0) {
            if (!pendingApplication.requiredApprovers.includes(staffMember.id)) {
                return { success: false, message: "Still waiting approvals from required approvers" };
            }

            await database.removePendingApplicationApprover(pendingApplication.userId, pendingApplication.guildId, staffMember.id);

            const oldEmbed = verificationMessage.embeds[0];
            if (!oldEmbed) {
                return { success: false, message: "Couldn't find the embed of the message" };
            }

            const newEmbed = new EmbedBuilder(oldEmbed.data)
                .setFields([]);

            if (!oldEmbed.data.fields) {
                return { success: false, message: "Couldn't find embed fields" };
            }

            for (const field of oldEmbed.data.fields) {
                if (field.name === "Required approvals") {
                    continue;
                }

                newEmbed.addFields(field);
            }

            const filteredApprovers = pendingApplication.requiredApprovers.filter((approver) => approver !== staffMember.id);
            if (filteredApprovers.length > 0) {
                const updatedApprovers = filteredApprovers.map((approver) => `<@${approver}>`).join(", ").trim();
                newEmbed.addFields({ name: "Required approvals", value: updatedApprovers });
            }

            await verificationMessage.edit({ content: verificationMessage.content, embeds: [newEmbed], components: verificationMessage.components });
            return { success: false, message: "Approved, please approve again if no more required approvals are left or wait for others" };
        }

        const unverifiedRole = await database.getUnverifiedRole(guild);
        const memberRole = await database.getMemberRole(guild);

        if (!memberRole) {
            return { success: false, message: "Couldn't find the member role." };
        }

        const member = await guild.members.fetch(pendingApplication.userId);
        if (!member) {
            return { success: false, message: "Couldn't find the member." };
        }

        const oldEmbed = verificationMessage.embeds[0];
        if (!oldEmbed) {
            return { success: false, message: "There was an error finding the embed." };
        }

        if (unverifiedRole) {
            await member.roles.remove(unverifiedRole);
        }

        await member.roles.add(memberRole);

        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setColor(Colors.Green)
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