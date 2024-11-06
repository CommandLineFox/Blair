import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from 'database/database';
import { Colors, EmbedBuilder, type ButtonInteraction } from 'discord.js';
import { Buttons } from 'types/component';

export class ApproveButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(Buttons.APPROVE_BUTTON)) {
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

        const unverifiedRole = await database.getUnverifiedRole(interaction.guild);
        const memberRole = await database.getMemberRole(interaction.guild);

        if (!memberRole) {
            await interaction.reply({ content: "Couldn't find the member role.", ephemeral: true });
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

        if (unverifiedRole) {
            await member.roles.remove(unverifiedRole);
        }

        await member.roles.add(memberRole);

        const newEmbed = new EmbedBuilder(oldEmbed.data)
            .setColor(Colors.Green);

        await interaction.message.edit({ embeds: [newEmbed], components: [] });
        await database.removePendingApplication(member.id, interaction.guild.id);
    }
}