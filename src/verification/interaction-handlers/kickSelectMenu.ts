import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from '../../database/database';
import { Colors, EmbedBuilder, Message, PermissionFlagsBits, TextChannel, StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import { Menus } from '../../types/component';
import { blockFreshInteraction, getModerationReason, isStaff, logQuestioning } from '../../utils/utils';

export class KickMenuHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.SelectMenu
        });
    }

    public override async parse(interaction: StringSelectMenuInteraction) {
        if (!interaction.customId.startsWith(Menus.KICK_MENU)) {
            return this.none();
        }

        const split = interaction.customId.split("_");
        const channelId = split[1];
        if (!channelId) {
            return this.none();
        }

        const verificationLogChannel = await interaction.guild?.channels.fetch(channelId);
        if (!verificationLogChannel) {
            return this.none();
        }

        const messageId = split[2];
        if (!messageId) {
            return this.none();
        }

        const verificationMessage = await (verificationLogChannel as TextChannel).messages.fetch(messageId);
        if (!verificationMessage) {
            return this.none();
        }
        return this.some(verificationMessage);
    }

    /**
     * Handle what happens when the kick button is pressed in the verification log channel
     * @param interaction The menu interaction
     */
    public async run(interaction: StringSelectMenuInteraction, verificationMessage: Message): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        //Prevent this from running if the bot was started less than 5 minutes ago
        const blockInteraction = await blockFreshInteraction(interaction);
        if (blockInteraction) {
            return;
        }

        if (!interaction.guild) {
            await interaction.editReply({ content: "This menu can only work in a guild" });
            return;
        }

        if (!interaction.member) {
            await interaction.editReply({ content: "Couldn't find the member that started the interaction" });
            return;
        }

        const staffMember = await interaction.guild.members.fetch(interaction.member.user.id);
        if (!staffMember) {
            await interaction.editReply({ content: "Couldn't find the member in the server" });
            return;
        }

        const staffCheck = await isStaff(staffMember);
        if (!staffCheck) {
            await interaction.editReply({ content: "Only staff members can interact with this" });
            return;
        }

        const channel = await interaction.client.channels.fetch(interaction.channelId) as TextChannel;
        if (!channel) {
            await interaction.editReply({ content: "Couldn't find the channel." });
            return;
        }

        const database = Database.getInstance();
        const messageId = verificationMessage.id;
        const pendingApplication = await database.getPendingApplicationFromMessage(messageId);
        if (!pendingApplication) {
            await interaction.editReply({ content: "Couldn't find the pending application." });
            return;
        }

        const member = await interaction.guild.members.fetch(pendingApplication.userId);
        if (!member) {
            await interaction.editReply({ content: "Couldn't find the member." });
            return;
        }

        const oldEmbed = verificationMessage.embeds[0];
        if (!oldEmbed) {
            await interaction.editReply({ content: "There was an error finding the embed." });
            return;
        }

        //Check if the bot can add the permission override for the channel
        const botPermissions = channel.permissionsFor(interaction.client.user);
        if (!botPermissions?.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.editReply({ content: "The bot doesn't have the manage roles permission in that channel" });
            return;
        }

        //Check if the bot can delete the staff member's message in the channel
        if (!botPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.editReply({ content: "The bot doesn't have the manage messages permission in that channel" });
            return;
        }

        //Get the reason for moderating and send it to the user
        const reason = await getModerationReason(interaction, channel, staffMember);
        if (!reason) {
            await interaction.editReply({ content: "Couldn't find the reason" });
            return;
        }

        await member.send(`You've been kicked from ${interaction.guild.name} during verification for the following reason: ${reason}`);
        await member.kick(reason);

        //Update the embed to indicate banning the user
        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setTitle(`${oldEmbed.title} | Kicked`)
            .setColor(Colors.Red)
            .addFields([{ name: "Handled by", value: `${staffMember.user.username} (${staffMember.id})` }, { name: "Reason", value: reason }]);

        await interaction.editReply({ content: "Kicked" });

        //If there's ongoing questioning delete the channel
        const questioningChannelId = pendingApplication.questioningChannelId;
        if (questioningChannelId) {
            const questioningChannel = await interaction.guild.channels.fetch(questioningChannelId);
            const questioningLogChannel = await database.getQuestioningLog(interaction.guild);

            if (questioningChannel && questioningLogChannel) {
                //Putting the contents of the questioning channel into a file and logging it
                await logQuestioning(questioningChannel as TextChannel, questioningLogChannel, member);
                questioningChannel.delete("Questioning completed");
            }
        }

        await verificationMessage.edit({ embeds: [newEmbed], components: [] });
        await database.removePendingApplication(member.id, interaction.guild.id);
    }
}