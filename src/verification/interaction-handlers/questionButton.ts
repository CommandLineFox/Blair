import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from '../../database/database';
import { ChannelType, Colors, EmbedBuilder, MessageFlags, PermissionFlagsBits, type ButtonInteraction } from 'discord.js';
import { Buttons } from '../../types/component';
import { blockFreshInteraction, isStaff } from '../../utils/utils';

export class KickButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(Buttons.QUESTION_BUTTON)) {
            return this.none();
        }

        return this.some();
    }

    /**
     * Handle what happens when the approve button gets pressed in the verification log channel
     * @param interaction The button interaction
     */
    public async run(interaction: ButtonInteraction): Promise<void> {
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
            await interaction.editReply({ content: "This button can only work in a guild" });
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

        const channel = await interaction.client.channels.fetch(interaction.channelId);
        if (!channel) {
            await interaction.editReply({ content: "Couldn't find the channel." });
            return;
        }

        const database = Database.getInstance();

        const messageId = interaction.message.id;
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

        const oldEmbed = interaction.message.embeds[0];
        if (!oldEmbed) {
            await interaction.editReply({ content: "There was an error finding the embed." });
            return;
        }

        const questioningCategory = await database.getQuestioningCategory(interaction.guild);
        if (!questioningCategory) {
            await interaction.editReply({ content: "The questioning category isn't set." });
            return;
        }

        const botPermissions = questioningCategory.permissionsFor(interaction.client.user);
        if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            await interaction.editReply({ content: "The bot doesn't have the manage channels permission" });
            return;
        }

        if (!botPermissions?.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.editReply({ content: "The bot doesn't have the manage permissions permission" });
            return;
        }

        let questioningChannel;
        //Create the questioning channel and assign permissions to the member that's questioned to be able to see it
        try {
            questioningChannel = await questioningCategory.children.create({ name: `${member.user.username}-questioning`, type: ChannelType.GuildText });
            await questioningChannel.permissionOverwrites.create(member.user, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, });
        } catch (error) {
            await interaction.editReply({ content: "Something went wrong when creating the channel and setting up permissions for them" });
            return;
        }

        await database.setPendingApplicationQuestioningChannelId(member.id, interaction.guild.id, questioningChannel.id);

        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setTitle(`${oldEmbed.title} | Questioned`)
            .setColor(Colors.Yellow)
            .addFields({ name: "Questioned by", value: `${staffMember.user.username} (${staffMember.id})` });

        await interaction.message.edit({ embeds: [newEmbed], components: [] });
        await interaction.editReply({ content: "Questioning" });
    }
}