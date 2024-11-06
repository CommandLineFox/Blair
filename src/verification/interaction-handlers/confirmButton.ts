import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import Database from 'database/database';
import { EmbedBuilder, PermissionFlagsBits, type ButtonInteraction, type DMChannel } from 'discord.js';
import { Buttons, getHandlingComponent } from 'types/component';

export class ConfirmButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(Buttons.CONFIRM_BUTTON)) {
            return this.none();
        }

        const guildId = interaction.customId.split("_")[1];
        if (!guildId) {
            return this.none();
        }

        const guild = interaction.client.guilds.cache.find((g) => g.id === guildId);
        if (!guild) {
            return this.none();
        }
        return this.some(guildId);
    }

    /**
     * Handle what happens when the confirm button gets pressed in a DM channel
     * @param interaction The button interaction
     */
    public async run(interaction: ButtonInteraction, guildId: string): Promise<void> {
        const channel = await interaction.client.channels.fetch(interaction.channelId);
        if (!channel) {
            await interaction.reply({ content: "Couldn't find the channel.", ephemeral: true });
            return;
        }

        const message = await (channel as DMChannel).messages.fetch(interaction.message.id);
        await message.edit({ content: interaction.message.content, components: [] });

        const user = interaction.user;
        const database = Database.getInstance();

        const pendingApplication = await database.getPendingApplication(user.id, guildId);
        if (!pendingApplication) {
            await interaction.reply({ content: "There was an error finding your application.", ephemeral: true });
            return;
        }

        const guild = await interaction.client.guilds.fetch(guildId);

        const verificationLogChannel = await database.getVerificationLog(guild);
        if (!verificationLogChannel) {
            await interaction.reply({ content: "Couldn't find the verification log channel.", ephemeral: true });
            return;
        }


        const permissions = verificationLogChannel.permissionsFor(interaction.client.user);
        if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
            await interaction.reply({ content: "The bot doesn't have the send messages permission in that channel", ephemeral: true });
            return;
        }

        const verificationEmbed = new EmbedBuilder()
            .setTitle(`Verification for ${user.displayName}`)
            .setThumbnail(user.avatarURL())
            .setTimestamp()
            .addFields([
                { name: "Username", value: user.username },
                { name: "User ID", value: user.id }
            ]);

        const questionAmount = pendingApplication.questions.length;
        for (let i = 0; i < questionAmount; i++) {
            const question = pendingApplication.questions[i];
            const answer = pendingApplication.answers[i];
            if (!question || !answer) {
                continue;
            }

            verificationEmbed.addFields([{ name: question, value: answer }]);
        }

        if (pendingApplication.requiredApprovers.length > 0) {
            const mappedApprovers = pendingApplication.requiredApprovers.map((approver) => `<@${approver}>`).join(", ").trim();
            verificationEmbed.addFields([{ name: "Required approvals", value: mappedApprovers }]);
        }

        const row = getHandlingComponent();
        const verificationLogMessage = await verificationLogChannel.send({ embeds: [verificationEmbed], components: [row] });

        await database.setPendingApplicationMessageId(user.id, guildId, verificationLogMessage.id);
        await interaction.reply({ content: "Successfully applied, please be patient.", ephemeral: true });
    }
}