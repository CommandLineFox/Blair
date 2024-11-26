import { Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import Database from '../../database/database';
import { ActionRowBuilder, CommandInteraction, Message, PermissionFlagsBits, StringSelectMenuBuilder, TextChannel, User } from 'discord.js';
import { getBanReasonComponent, getKickReasonComponent } from '../../types/component';
import { CustomResponse } from '../../types/customResponse';
import { isStaff, logQuestioning } from '../../utils/utils';

export class DenyCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'deny',
            description: 'Deny a user during questioning',
            detailedDescription: "'Deny a user during questioning",
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
                        .setDescription("Choose to kick or ban the user")
                        .addChoices([{ name: "Kick", value: "kick" }, { name: "Ban", value: "ban" }])
                        .setRequired(true)
                ),
            { idHints: ["1310732496198963241"] }
        );
    }
    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const action = interaction.options.getString('action');
        if (!['kick', 'ban'].includes(action!)) {
            await interaction.editReply({ content: 'Invalid action. Choose either "kick" or "ban".' });
            return;
        }

        const result = await this.denyUser(interaction, interaction.user, action!);
        if (!result.success) {
            await interaction.editReply({ content: result.message });
        }
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

        const result = await this.denyUser(message, message.author, action);
        if (!result.success) {
            await message.reply({ content: result.message });
        }
    }

    /**
     * Deny a user from the server
     * @param interactionOrMessage Interaction or message depending on if it was a slash command or message command 
     * @param staffMember The staff member handling the application
     * @param action Kick or ban
     * @returns Whether it was successful or not and a message
     */
    private async denyUser(interactionOrMessage: CommandInteraction | Message, staffMember: User, action: string): Promise<CustomResponse> {
        const guild = interactionOrMessage.guild!;
        const channelId = interactionOrMessage.channelId;

        const staffmemberMember = await guild.members.fetch(staffMember);
        const staffCheck = await isStaff(staffmemberMember);
        if (!staffCheck) {
            return { success: false, message: "Only staff members can interact with this" };
        }

        const database = Database.getInstance();

        //Getting values from the database
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

        //Checking if the bot can send messages and attach files in the questioning log channel
        const botPermissions = guild.members.me?.permissions;
        if (!botPermissions?.has(PermissionFlagsBits.SendMessages | PermissionFlagsBits.AttachFiles)) {
            return { success: false, message: "The bot doesn't have the send messages or attach files permission in the questioning log channel" };
        }

        if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
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

        //Depending on chosen action, kick or ban the user
        if (action === "kick") {
            const permissions = questioningChannel.permissionsFor(staffMember);
            if (!permissions?.has(PermissionFlagsBits.KickMembers)) {
                return { success: false, message: "You don't have the kick members permission in that channel" };
            }

            if (!member.kickable) {
                return { success: false, message: "The bot cannot moderate this user as they have the same or higher role than the bot" };
            }

            const row = await getKickReasonComponent(guild, verificationLogChannel.id, pendingApplication.messageId);
            await this.sendMessage(interactionOrMessage, row, "Please pick a reason or enter a custom one");
        } else {
            const permissions = questioningChannel.permissionsFor(staffMember);
            if (!permissions?.has(PermissionFlagsBits.BanMembers)) {
                return { success: false, message: "You don't have the ban members permission in that channel" };
            }

            if (!member.bannable) {
                return { success: false, message: "The bot cannot moderate this user as they have the same or higher role than the bot" };
            }

            const row = await getBanReasonComponent(guild, verificationLogChannel.id, pendingApplication.messageId);
            await this.sendMessage(interactionOrMessage, row, "Please pick a reason or enter a custom one");
        }

        //Putting the contents of the questioning channel into a file and logging it
        await logQuestioning(questioningChannel as TextChannel, questioningLogChannel, member);

        return { success: true, message: "Please choose a reason to deny the user with" };
    }

    /**
     * Send the reason choice dropdown
     * @param interactionOrMessage Interaction or message depending on if it was a slash command or message command
     * @param component The action row with the dropdown in it
     * @param content The message content
     */
    private async sendMessage(interactionOrMessage: CommandInteraction | Message, component: ActionRowBuilder<StringSelectMenuBuilder>, content: string) {
        if (interactionOrMessage instanceof CommandInteraction) {
            await interactionOrMessage.reply({ content, components: [component], ephemeral: true });
        } else {
            await interactionOrMessage.reply({ content, components: [component] });
        }
    }
}