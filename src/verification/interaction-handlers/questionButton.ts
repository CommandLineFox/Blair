import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from 'database/database';
import { ChannelType, Colors, EmbedBuilder, PermissionFlagsBits, type ButtonInteraction } from 'discord.js';
import { Buttons } from 'types/component';
import { isStaff } from 'utils/utils';

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
        if (!interaction.guild) {
            await interaction.reply({ content: "This button can only work in a guild", ephemeral: true });
            return;
        }

        if (!interaction.member) {
            await interaction.reply({ content: "Couldn't find the member that started the interaction", ephemeral: true });
            return;
        }

        const staffMember = await interaction.guild.members.fetch(interaction.member.user.id);
        if (!staffMember) {
            await interaction.reply({ content: "Couldn't find the member in the server", ephemeral: true });
            return;
        }

        const staffCheck = await isStaff(staffMember);
        if (!staffCheck) {
            await interaction.reply({ content: "Only staff members can interact with this", ephemeral: true });
            return;
        }

        const channel = await interaction.client.channels.fetch(interaction.channelId);
        if (!channel) {
            await interaction.reply({ content: "Couldn't find the channel.", ephemeral: true });
            return;
        }

        const database = Database.getInstance();

        const messageId = interaction.message.id;
        const pendingApplication = await database.getPendingApplicationFromMessage(messageId);
        if (!pendingApplication) {
            await interaction.reply({ content: "Couldn't find the pending application.", ephemeral: true });
            return;
        }

        const member = await interaction.guild.members.fetch(pendingApplication.userId);
        if (!member) {
            await interaction.reply({ content: "Couldn't find the member.", ephemeral: true });
            return;
        }

        const oldEmbed = interaction.message.embeds[0];
        if (!oldEmbed) {
            await interaction.reply({ content: "There was an error finding the embed.", ephemeral: true });
            return;
        }

        const questioningCategory = await database.getQuestioningCategory(interaction.guild);
        if (!questioningCategory) {
            await interaction.reply({ content: "The questioning category isn't set.", ephemeral: true });
            return;
        }

        const permissions = questioningCategory.permissionsFor(staffMember);
        if (!permissions?.has(PermissionFlagsBits.ManageChannels)) {
            await interaction.reply({ content: "The bot doesn't have the manage channels permission" });
            return;
        }

        const questioningChannel = await questioningCategory.children.create({ name: `${member.user.username}-questioning`, type: ChannelType.GuildText });
        await database.setPendingApplicationQuestioningChannelId(interaction.user.id, interaction.guild.id, questioningChannel.id);

        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setTitle(`${oldEmbed.title} | Questioned`)
            .setColor(Colors.Yellow)
            .addFields({ name: "Questioned by", value: `${staffMember.user.username} (${staffMember.id})` });

        await interaction.message.edit({ embeds: [newEmbed], components: [] });
    }
}