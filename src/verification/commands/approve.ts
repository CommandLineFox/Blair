import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import Database from '../../database/database';
import { Colors, EmbedBuilder, Guild, Message, MessageFlags, PermissionFlagsBits, TextChannel, User } from 'discord.js';
import { CustomResponse } from '../../types/customResponse';
import { isStaff, logQuestioning } from '../../utils/utils';

export class ApproveCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'approve',
            description: 'Approve a user during questioning',
            detailedDescription: "Approve a user during questioning",
            runIn: CommandOptionsRunTypeEnum.GuildText,
            preconditions: ['UptimeCheck']
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description),
            { idHints: ["1310732490390114324"] }
        )
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const result = await this.approveUser(interaction.guild!, interaction.channel!.id, interaction.user);
        await interaction.editReply({ content: result.message });
    }

    public override async messageRun(message: Message): Promise<void> {
        const result = await this.approveUser(message.guild!, message.channel.id, message.author);
        await message.reply({ content: result.message });
    }

    private async approveUser(guild: Guild, channelId: string, staffMember: User): Promise<CustomResponse> {
        const staffmemberMember = await guild.members.fetch(staffMember);
        const staffCheck = await isStaff(staffmemberMember);
        if (!staffCheck) {
            return { success: false, message: "Only staff members can interact with this." };
        }

        const database = Database.getInstance();

        //Getting values from the database
        const pendingApplication = await database.getPendingApplicationFromQuestioningChannel(channelId);
        if (!pendingApplication) {
            return { success: false, message: "Couldn't find the pending application." };
        }

        const questioningChannel = await guild.channels.fetch(channelId);
        if (!questioningChannel) {
            return { success: false, message: "Couldn't find the questioning channel." };
        }

        const verificationLogChannel = await database.getVerificationLog(guild);
        if (!verificationLogChannel) {
            return { success: false, message: "Couldn't find the verification log channel." };
        }

        if (!pendingApplication.messageId) {
            return { success: false, message: "Couldn't find the message ID for the message in the verification log channel." };
        }

        const verificationMessage = await verificationLogChannel.messages.fetch(pendingApplication.messageId);
        if (!verificationMessage) {
            return { success: false, message: "Couldn't find the message in the channel." };
        }

        const questioningLogChannel = await database.getQuestioningLog(guild);
        if (!questioningLogChannel) {
            return { success: false, message: "Couldn't find the questioning log channel." };
        }

        //Checking if the bot can send messages and attach files in the questioning log channel
        const botPermissions = guild.members.me?.permissions;
        if (!botPermissions?.has(PermissionFlagsBits.SendMessages | PermissionFlagsBits.AttachFiles)) {
            return { success: false, message: "The bot doesn't have the send messages or attach files permission in the questioning log channel." };
        }

        //Checking if the bot can delete the questioning channel
        if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return { success: false, message: "The bot doesn't have the permission to delete the questioning channel." };
        }

        //If the pending application requires additional approval, checking for if one of those users ran the command
        if (pendingApplication.requiredApprovers.length > 0) {
            if (!pendingApplication.requiredApprovers.includes(staffMember.id)) {
                return { success: false, message: "Still waiting approvals from required approvers." };
            }

            await database.removePendingApplicationApprover(pendingApplication.userId, pendingApplication.guildId, staffMember.id);

            //Updating the verification log embed
            const oldEmbed = verificationMessage.embeds[0];
            if (!oldEmbed) {
                return { success: false, message: "Couldn't find the embed of the message." };
            }

            const newEmbed = new EmbedBuilder(oldEmbed.data)
                .setFields([]);

            if (!oldEmbed.data.fields) {
                return { success: false, message: "Couldn't find embed fields." };
            }

            for (const field of oldEmbed.data.fields) {
                if (field.name === "Required approvals") {
                    continue;
                }

                newEmbed.addFields(field);
            }

            //If there's still any approvers left, add the embed field
            const filteredApprovers = pendingApplication.requiredApprovers.filter((approver) => approver !== staffMember.id);
            if (filteredApprovers.length > 0) {
                const updatedApprovers = filteredApprovers.map((approver) => `<@${approver}>`).join(", ").trim();
                newEmbed.addFields({ name: "Required approvals", value: updatedApprovers });
            }

            await verificationMessage.edit({ content: verificationMessage.content, embeds: [newEmbed], components: verificationMessage.components });
            return { success: false, message: "Approved, please approve again if no more required approvals are left or wait for others." };
        }

        //Adding the member role and removing the unverified role from the user
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

        //Updating the embed to indicate approval of a user
        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setTitle(`${oldEmbed.title} | Approved`)
            .setColor(Colors.Green)
            .addFields({ name: "Handled by", value: `${staffMember.username} (${staffMember.id})` });

        await verificationMessage.edit({ embeds: [newEmbed], components: [] });

        //Putting the contents of the questioning channel into a file and logging it
        await logQuestioning(questioningChannel as TextChannel, questioningLogChannel, member);
        await questioningChannel.delete("Questioning complete");

        await database.removePendingApplication(member.id, guild.id);

        //Posting the welcome message
        const welcomeToggle = await database.getWelcomeToggle(guild);
        if (welcomeToggle) {
            const welcomeChannel = await database.getWelcomeChannel(guild);
            if (!welcomeChannel) {
                return { success: false, message: "Couldn't find the welcome channel." };
            }

            let welcomeMessage = await database.getWelcomeMessage(guild);
            if (!welcomeMessage) {
                return { success: false, message: "Couldn't find the welcome message." };
            }

            welcomeMessage = welcomeMessage.replace(/\[member\]/g, `<@${member.id}>`);
            await welcomeChannel.send(welcomeMessage);
        }

        return { success: true, message: "Successfully approved the user." };
    }
}